import { NextRequest, NextResponse } from "next/server";
import { getLanguageById } from "@/lib/languages";
import { exec, spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import vm from "vm";

// Helper to execute Python locally in an isolated child process with timeout
async function runLocalPython(code: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `codeconnect_${Date.now()}_${Math.random().toString(36).slice(2)}.py`);

    try {
      fs.writeFileSync(tempFile, code, "utf-8");
    } catch (err: any) {
      return resolve({ stdout: "", stderr: `File system error: ${err.message}`, exitCode: 1 });
    }

    const pyProcess = spawn("python", [tempFile], {
      timeout: 5000,
    });

    let stdout = "";
    let stderr = "";

    pyProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pyProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

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

    pyProcess.on("error", (err) => {
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch {}
      resolve({
        stdout: "",
        stderr: `Execution error: ${err.message}`,
        exitCode: 1,
      });
    });
  });
}

// Helper to execute JavaScript/TypeScript in isolated VM context
async function runNodeVm(code: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const logs: string[] = [];
    const errors: string[] = [];

    const sandboxConsole = {
      log: (...args: any[]) => logs.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" ")),
      info: (...args: any[]) => logs.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" ")),
      warn: (...args: any[]) => logs.push(`[WARN] ${args.map((a) => String(a)).join(" ")}`),
      error: (...args: any[]) => errors.push(args.map((a) => String(a)).join(" ")),
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
    };

    const context = vm.createContext(sandbox);

    try {
      const script = new vm.Script(code);
      const result = script.runInContext(context, { timeout: 3000 });
      if (result !== undefined && logs.length === 0) {
        logs.push(`➜ ${typeof result === "object" ? JSON.stringify(result, null, 2) : String(result)}`);
      }
      resolve({
        stdout: logs.join("\n"),
        stderr: errors.join("\n"),
        exitCode: errors.length > 0 ? 1 : 0,
      });
    } catch (err: any) {
      resolve({
        stdout: logs.join("\n"),
        stderr: `Runtime Error: ${err.message}`,
        exitCode: 1,
      });
    }
  });
}

// Wandbox API integration for C++, C, Rust, Go
async function runWandbox(compiler: string, code: string): Promise<{ stdout: string; stderr: string; exitCode: number } | null> {
  try {
    const res = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compiler,
        code,
        save: false,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return {
      stdout: data.program_output || "",
      stderr: (data.compiler_error || "") + (data.program_error || ""),
      exitCode: data.status === "0" ? 0 : 1,
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { language, code } = await req.json();

    if (!language || code === undefined) {
      return NextResponse.json(
        { error: "Language and code are required." },
        { status: 400 }
      );
    }

    const langConfig = getLanguageById(language);

    // 1. Python Execution
    if (language === "python") {
      const res = await runLocalPython(code);
      return NextResponse.json({
        stdout: res.stdout,
        stderr: res.stderr,
        exitCode: res.exitCode,
        executionTimeMs: Date.now() - startTime,
      });
    }

    // 2. JavaScript / TypeScript Execution
    if (language === "javascript" || language === "typescript") {
      const res = await runNodeVm(code);
      return NextResponse.json({
        stdout: res.stdout,
        stderr: res.stderr,
        exitCode: res.exitCode,
        executionTimeMs: Date.now() - startTime,
      });
    }

    // 3. C++ Execution via Wandbox
    if (language === "cpp") {
      const res = await runWandbox("gcc-13.2.0", code);
      if (res) {
        return NextResponse.json({
          stdout: res.stdout,
          stderr: res.stderr,
          exitCode: res.exitCode,
          executionTimeMs: Date.now() - startTime,
        });
      }
    }

    // 4. C Execution via Wandbox
    if (language === "c") {
      const res = await runWandbox("gcc-13.2.0-c", code);
      if (res) {
        return NextResponse.json({
          stdout: res.stdout,
          stderr: res.stderr,
          exitCode: res.exitCode,
          executionTimeMs: Date.now() - startTime,
        });
      }
    }

    // 5. Rust Execution via Wandbox
    if (language === "rust") {
      const res = await runWandbox("rust-1.70.0", code);
      if (res) {
        return NextResponse.json({
          stdout: res.stdout,
          stderr: res.stderr,
          exitCode: res.exitCode,
          executionTimeMs: Date.now() - startTime,
        });
      }
    }

    // 6. Go Execution via Wandbox
    if (language === "go") {
      const res = await runWandbox("go-1.20.4", code);
      if (res) {
        return NextResponse.json({
          stdout: res.stdout,
          stderr: res.stderr,
          exitCode: res.exitCode,
          executionTimeMs: Date.now() - startTime,
        });
      }
    }

    // Fallback info for unsupported execution languages
    return NextResponse.json({
      stdout: "",
      stderr: `Execution is currently supported for JavaScript, TypeScript, Python, C, C++, Rust, and Go. Live syntax highlighting and real-time collaboration remain active for ${langConfig.name}.`,
      exitCode: 0,
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
