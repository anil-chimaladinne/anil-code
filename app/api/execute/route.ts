import { NextRequest, NextResponse } from "next/server";
import { getLanguageById } from "@/lib/languages";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import vm from "vm";
import ts from "typescript";
import initSqlJs from "sql.js";

// Helper to execute Python locally in an isolated child process with timeout
async function runLocalPython(
  code: string,
  stdin?: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const tempDir = os.tmpdir();
    const tempFile = path.join(
      tempDir,
      `codeconnect_${Date.now()}_${Math.random().toString(36).slice(2)}.py`
    );

    try {
      fs.writeFileSync(tempFile, code, "utf-8");
    } catch (err: any) {
      return resolve({
        stdout: "",
        stderr: `File system error: ${err.message}`,
        exitCode: 1,
      });
    }

    const pyProcess = spawn("python", [tempFile], {
      timeout: 10000,
    });

    let stdout = "";
    let stderr = "";

    pyProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pyProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    if (stdin) {
      try {
        pyProcess.stdin.write(stdin);
      } catch {}
    }
    try {
      pyProcess.stdin.end();
    } catch {}

    pyProcess.on("close", (code) => {
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch {}
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 0,
      });
    });

    pyProcess.on("error", () => {
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch {}
      resolve({
        stdout: "",
        stderr: "__LOCAL_PY_NOT_FOUND__",
        exitCode: 1,
      });
    });
  });
}

// Helper to execute JavaScript/TypeScript in isolated VM context
async function runNodeVm(
  code: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const logs: string[] = [];
    const errors: string[] = [];

    const formatArg = (a: any) =>
      typeof a === "object" && a !== null
        ? JSON.stringify(a, null, 2)
        : String(a);

    const sandboxConsole = {
      log: (...args: any[]) => logs.push(args.map(formatArg).join(" ")),
      info: (...args: any[]) => logs.push(args.map(formatArg).join(" ")),
      warn: (...args: any[]) => logs.push(`[WARN] ${args.map(formatArg).join(" ")}`),
      error: (...args: any[]) => errors.push(args.map(formatArg).join(" ")),
    };

    const sandbox = {
      console: sandboxConsole,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      Math,
      Date,
      JSON,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Map,
      Set,
      Promise,
      Buffer,
    };

    const context = vm.createContext(sandbox);

    try {
      const script = new vm.Script(code);
      const result = script.runInContext(context, { timeout: 4000 });
      if (result !== undefined && logs.length === 0) {
        logs.push(
          `➜ ${
            typeof result === "object"
              ? JSON.stringify(result, null, 2)
              : String(result)
          }`
        );
      }
      resolve({
        stdout: logs.join("\n"),
        stderr: errors.join("\n"),
        exitCode: errors.length > 0 ? 1 : 0,
      });
    } catch (err: any) {
      resolve({
        stdout: logs.join("\n"),
        stderr: `Runtime / Compilation Error: ${err.message}`,
        exitCode: 1,
      });
    }
  });
}

// Wandbox API integration for C++, C, Rust, Go, Java, Python, and remote SQLite fallback
async function runWandbox(
  compiler: string,
  code: string,
  stdin?: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const res = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compiler,
        code,
        stdin: stdin || "",
        save: false,
      }),
      signal: AbortSignal.timeout(30000),
    });

    const text = await res.text();
    if (!res.ok) {
      return {
        stdout: "",
        stderr: `Compiler service returned HTTP ${res.status}: ${text}`,
        exitCode: 1,
      };
    }

    try {
      const data = JSON.parse(text);
      const stdout = data.program_output || "";
      const stderr = (data.compiler_error || "") + (data.program_error || "");
      return {
        stdout: stdout.trimEnd(),
        stderr: stderr.trimEnd(),
        exitCode: data.status === "0" ? 0 : 1,
      };
    } catch {
      return {
        stdout: "",
        stderr: text,
        exitCode: 1,
      };
    }
  } catch (err: any) {
    return {
      stdout: "",
      stderr: `Execution service error: ${err.message || "Timeout or unreachable"}`,
      exitCode: 1,
    };
  }
}

// Lazy-initialized sql.js instance for ultra-fast, zero-dependency in-memory SQLite
let sqlJsInstancePromise: Promise<any> | null = null;
function getSqlEngine() {
  if (!sqlJsInstancePromise) {
    try {
      const initFn =
        typeof initSqlJs === "function"
          ? initSqlJs
          : (initSqlJs as any).default || initSqlJs;

      const wasmPath = path.join(
        process.cwd(),
        "node_modules",
        "sql.js",
        "dist",
        "sql-wasm.wasm"
      );
      if (fs.existsSync(wasmPath)) {
        const wasmBinary = fs.readFileSync(wasmPath);
        sqlJsInstancePromise = initFn({ wasmBinary });
      } else {
        sqlJsInstancePromise = initFn();
      }
    } catch (err) {
      console.error("[sql.js init error]:", err);
      const initFn =
        typeof initSqlJs === "function"
          ? initSqlJs
          : (initSqlJs as any).default || initSqlJs;
      sqlJsInstancePromise = initFn();
    }
  }
  return sqlJsInstancePromise;
}

// ASCII table formatter for CLI / text terminal display
function formatSqlTable(headers: string[], rows: any[][]): string {
  if (!headers || headers.length === 0) return "";
  const colWidths = headers.map((h, i) => {
    let max = String(h).length;
    for (const r of rows) {
      const val = r[i] === null || r[i] === undefined ? "NULL" : String(r[i]);
      if (val.length > max) max = val.length;
    }
    return max;
  });

  const sep = "+" + colWidths.map((w) => "-".repeat(w + 2)).join("+") + "+";
  const headerLine =
    "|" +
    headers.map((h, i) => ` ${String(h).padEnd(colWidths[i])} `).join("|") +
    "|";
  const lines = [sep, headerLine, sep];

  for (const r of rows) {
    const rowLine =
      "|" +
      r
        .map((val, i) => {
          const str = val === null || val === undefined ? "NULL" : String(val);
          return ` ${str.padEnd(colWidths[i])} `;
        })
        .join("|") +
      "|";
    lines.push(rowLine);
  }
  lines.push(sep);
  return lines.join("\n");
}

// In-Memory SQLite execution with pre-seeded sample data & multi-statement query support
async function runSqlQueries(
  sqlCode: string
): Promise<{ stdout: string; stderr: string; exitCode: number; sqlResults?: any[] }> {
  try {
    const SQL = await getSqlEngine();
    const db = new SQL.Database();

    // Check if the user's code already defines 'users' or 'products' to avoid name collision
    const userCreatesUsers = /\bcreate\s+table\s+(if\s+not\s+exists\s+)?users\b/i.test(sqlCode);
    const userCreatesProducts = /\bcreate\s+table\s+(if\s+not\s+exists\s+)?products\b/i.test(sqlCode);

    if (!userCreatesUsers) {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          role TEXT DEFAULT 'developer',
          email TEXT UNIQUE
        );
        INSERT OR IGNORE INTO users (id, name, role, email) VALUES
          (1, 'Anil', 'Admin', 'anil@example.com'),
          (2, 'Alex', 'Developer', 'alex@example.com'),
          (3, 'Sarah', 'Designer', 'sarah@example.com'),
          (4, 'David', 'Engineer', 'david@example.com');
      `);
    }

    if (!userCreatesProducts) {
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          category TEXT,
          price REAL,
          stock INTEGER
        );
        INSERT OR IGNORE INTO products (id, name, category, price, stock) VALUES
          (1, 'MacBook Pro', 'Electronics', 1999.99, 15),
          (2, 'Wireless Mouse', 'Accessories', 49.99, 120),
          (3, 'Mechanical Keyboard', 'Accessories', 129.50, 45),
          (4, '4K Monitor', 'Electronics', 449.00, 30);
      `);
    }

    // Split SQL statements by semicolon while ignoring comments
    const rawStatements = sqlCode
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (rawStatements.length === 0) {
      return {
        stdout: "No executable SQL statements found.",
        stderr: "",
        exitCode: 0,
        sqlResults: [],
      };
    }

    const output: string[] = [];
    const sqlResults: any[] = [];

    for (let idx = 0; idx < rawStatements.length; idx++) {
      const stmt = rawStatements[idx];
      const cleanLines = stmt
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => !l.startsWith("--"));
      const cleanStmt = cleanLines.join(" ").trim();
      if (!cleanStmt) continue;

      const firstLine =
        cleanStmt.length > 60 ? cleanStmt.slice(0, 57) + "..." : cleanStmt;

      try {
        const isSelectLike = /^\s*(SELECT|PRAGMA|WITH|EXPLAIN)\b/i.test(cleanStmt);

        if (isSelectLike) {
          const queryRes = db.exec(cleanStmt);
          if (queryRes.length > 0) {
            const { columns, values } = queryRes[0];
            const strRows = values.map((row: any[]) =>
              row.map((v) => (v === null || v === undefined ? "NULL" : String(v)))
            );

            sqlResults.push({
              query: cleanStmt,
              isSelect: true,
              headers: columns,
              rows: strRows,
              rowCount: values.length,
            });

            output.push(`-- Query [${idx + 1}]: ${firstLine}`);
            output.push(formatSqlTable(columns, strRows));
            output.push(
              `(${values.length} row${values.length === 1 ? "" : "s"} returned)\n`
            );
          } else {
            sqlResults.push({
              query: cleanStmt,
              isSelect: true,
              headers: [],
              rows: [],
              rowCount: 0,
            });
            output.push(`-- Query [${idx + 1}]: ${firstLine}`);
            output.push("(0 rows returned)\n");
          }
        } else {
          db.run(cleanStmt);
          const rowsAff = db.getRowsModified();
          sqlResults.push({
            query: cleanStmt,
            isSelect: false,
            rowCount: rowsAff,
            message: `Executed successfully (${rowsAff} row(s) affected)`,
          });
          output.push(
            `[OK] Query [${idx + 1}]: ${firstLine} (${rowsAff} row(s) affected)\n`
          );
        }
      } catch (err: any) {
        return {
          stdout: output.join("\n"),
          stderr: `SQL Error in statement [${idx + 1}]:\n  ${firstLine}\n--> SQLite Error: ${err.message}`,
          exitCode: 1,
          sqlResults,
        };
      }
    }

    return {
      stdout: output.join("\n").trimEnd(),
      stderr: "",
      exitCode: 0,
      sqlResults,
    };
  } catch (err: any) {
    console.error("[runSqlQueries fallback to Wandbox]:", err);
    // Failover to Wandbox SQLite 3.46.1 if WebAssembly engine fails in environment
    const userCreatesUsers = /\bcreate\s+table\s+(if\s+not\s+exists\s+)?users\b/i.test(sqlCode);
    const userCreatesProducts = /\bcreate\s+table\s+(if\s+not\s+exists\s+)?products\b/i.test(sqlCode);

    let seed = ".header on\n.mode table\n";
    if (!userCreatesUsers) {
      seed += `
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, role TEXT, email TEXT);
INSERT OR IGNORE INTO users VALUES (1, 'Anil', 'Admin', 'anil@example.com'), (2, 'Alex', 'Developer', 'alex@example.com'), (3, 'Sarah', 'Designer', 'sarah@example.com');
`;
    }
    if (!userCreatesProducts) {
      seed += `
CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT, category TEXT, price REAL, stock INTEGER);
INSERT OR IGNORE INTO products VALUES (1, 'MacBook Pro', 'Electronics', 1999.99, 15), (2, 'Wireless Mouse', 'Accessories', 49.99, 120);
`;
    }

    const wandRes = await runWandbox(
      "sqlite-3.46.1",
      `${seed}\n${sqlCode}`
    );
    return {
      stdout: wandRes.stdout,
      stderr: wandRes.stderr,
      exitCode: wandRes.exitCode,
    };
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { language, code, stdin } = await req.json();

    if (!language || code === undefined) {
      return NextResponse.json(
        { error: "Language and code are required." },
        { status: 400 }
      );
    }

    const lang = (language || "").toLowerCase().trim();
    const langConfig = getLanguageById(lang);

    // 1. Python Execution (Local child process with fallback to Wandbox)
    if (lang === "python" || lang === "py") {
      const localRes = await runLocalPython(code, stdin);
      if (localRes.stderr !== "__LOCAL_PY_NOT_FOUND__") {
        return NextResponse.json({
          stdout: localRes.stdout,
          stderr: localRes.stderr,
          exitCode: localRes.exitCode,
          executionTimeMs: Date.now() - startTime,
        });
      }
      // Fallback to Wandbox
      const wandRes = await runWandbox("cpython-3.12.7", code, stdin);
      return NextResponse.json({
        ...wandRes,
        executionTimeMs: Date.now() - startTime,
      });
    }

    // 2. TypeScript Execution (Transpile via TypeScript engine + Run in VM)
    if (lang === "typescript" || lang === "ts") {
      try {
        const transpileRes = ts.transpileModule(code, {
          compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
          },
        });
        const vmRes = await runNodeVm(transpileRes.outputText);
        return NextResponse.json({
          stdout: vmRes.stdout,
          stderr: vmRes.stderr,
          exitCode: vmRes.exitCode,
          executionTimeMs: Date.now() - startTime,
        });
      } catch (err: any) {
        return NextResponse.json({
          stdout: "",
          stderr: `TypeScript Compilation Error: ${err.message}`,
          exitCode: 1,
          executionTimeMs: Date.now() - startTime,
        });
      }
    }

    // 3. JavaScript Execution
    if (lang === "javascript" || lang === "js") {
      const vmRes = await runNodeVm(code);
      return NextResponse.json({
        stdout: vmRes.stdout,
        stderr: vmRes.stderr,
        exitCode: vmRes.exitCode,
        executionTimeMs: Date.now() - startTime,
      });
    }

    // 4. C++ Execution (Wandbox GCC 13.2.0)
    if (lang === "cpp" || lang === "c++") {
      const wandRes = await runWandbox("gcc-13.2.0", code, stdin);
      return NextResponse.json({
        ...wandRes,
        executionTimeMs: Date.now() - startTime,
      });
    }

    // 5. C Execution (Wandbox GCC 13.2.0 C)
    if (lang === "c") {
      const wandRes = await runWandbox("gcc-13.2.0-c", code, stdin);
      return NextResponse.json({
        ...wandRes,
        executionTimeMs: Date.now() - startTime,
      });
    }

    // 6. Java Execution (Wandbox OpenJDK 21)
    if (lang === "java") {
      // Wandbox saves source as prog.java, so replace 'public class' with 'class' to avoid class name mismatch
      const sanitizedJava = code.replace(/\bpublic\s+class\b/g, "class");
      const wandRes = await runWandbox("openjdk-jdk-21+35", sanitizedJava, stdin);
      return NextResponse.json({
        ...wandRes,
        executionTimeMs: Date.now() - startTime,
      });
    }

    // 7. Rust Execution (Wandbox Rust 1.78.0)
    if (lang === "rust" || lang === "rs") {
      const wandRes = await runWandbox("rust-1.78.0", code, stdin);
      return NextResponse.json({
        ...wandRes,
        executionTimeMs: Date.now() - startTime,
      });
    }

    // 8. Go Execution (Wandbox Go 1.16.3)
    if (lang === "go" || lang === "golang") {
      const wandRes = await runWandbox("go-1.16.3", code, stdin);
      return NextResponse.json({
        ...wandRes,
        executionTimeMs: Date.now() - startTime,
      });
    }

    // 9. JSON Validation & Compilation
    if (lang === "json") {
      try {
        const parsed = JSON.parse(code);
        return NextResponse.json({
          stdout: `✓ JSON Syntax Valid\n\nFormatted Output:\n${JSON.stringify(parsed, null, 2)}`,
          stderr: "",
          exitCode: 0,
          executionTimeMs: Date.now() - startTime,
        });
      } catch (err: any) {
        return NextResponse.json({
          stdout: "",
          stderr: `JSON Parse Error: ${err.message}`,
          exitCode: 1,
          executionTimeMs: Date.now() - startTime,
        });
      }
    }

    // 10. SQL Real SQLite in-memory execution (sql.js WASM engine + sample schema)
    if (
      lang === "sql" ||
      lang === "sqlite" ||
      lang === "sqlite3" ||
      lang === "mysql" ||
      lang === "postgresql" ||
      lang === "postgres"
    ) {
      const sqlRes = await runSqlQueries(code);
      return NextResponse.json({
        stdout: sqlRes.stdout,
        stderr: sqlRes.stderr,
        exitCode: sqlRes.exitCode,
        sqlResults: sqlRes.sqlResults,
        executionTimeMs: Date.now() - startTime,
      });
    }

    // 11. HTML Preview
    if (lang === "html" || lang === "htm") {
      return NextResponse.json({
        stdout: code,
        stderr: "",
        exitCode: 0,
        isHtmlPreview: true,
        executionTimeMs: Date.now() - startTime,
      });
    }

    // Unsupported language fallback
    return NextResponse.json({
      stdout: "",
      stderr: `Execution is not currently supported for ${langConfig.name}. Supported languages: Python, JavaScript, TypeScript, C++, C, Java, Rust, Go, SQL, JSON, HTML.`,
      exitCode: 1,
      executionTimeMs: Date.now() - startTime,
    });
  } catch (err: any) {
    console.error("[Execution API Error]:", err);
    return NextResponse.json({
      stdout: "",
      stderr: `Execution error: ${err.message}`,
      exitCode: 1,
      executionTimeMs: Date.now() - startTime,
    });
  }
}
