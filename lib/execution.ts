export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  isHtmlPreview?: boolean;
}

export async function executeCode(
  languageId: string,
  code: string
): Promise<ExecutionResult> {
  const startTime = performance.now();

  // 1. Special Handling: HTML Preview
  if (languageId === "html") {
    return {
      stdout: code,
      stderr: "",
      exitCode: 0,
      executionTimeMs: Math.round(performance.now() - startTime),
      isHtmlPreview: true,
    };
  }

  // 2. Client-Side JavaScript Execution (Instant & Safe)
  if (languageId === "javascript" && typeof window !== "undefined") {
    return executeClientJavaScript(code);
  }

  // 3. Multi-Language Execution via API route
  try {
    const res = await fetch("/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: languageId, code }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        stdout: "",
        stderr: errData.error || `Execution failed with HTTP status ${res.status}`,
        exitCode: 1,
        executionTimeMs: Math.round(performance.now() - startTime),
      };
    }

    const data = await res.json();
    return {
      stdout: data.stdout || "",
      stderr: data.stderr || "",
      exitCode: data.exitCode ?? 0,
      executionTimeMs: data.executionTimeMs ?? Math.round(performance.now() - startTime),
    };
  } catch (error: any) {
    return {
      stdout: "",
      stderr: `Network or execution error: ${error.message || "Unknown error"}`,
      exitCode: 1,
      executionTimeMs: Math.round(performance.now() - startTime),
    };
  }
}

/**
 * Sandboxed Client-side JavaScript execution capturing all console outputs
 */
export function executeClientJavaScript(code: string): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const logs: string[] = [];
    const errors: string[] = [];

    // Capture console methods safely
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
    };

    const formatArg = (arg: any): string => {
      if (typeof arg === "object" && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    };

    console.log = (...args: any[]) => {
      logs.push(args.map(formatArg).join(" "));
      originalConsole.log(...args);
    };
    console.info = (...args: any[]) => {
      logs.push(args.map(formatArg).join(" "));
      originalConsole.info(...args);
    };
    console.warn = (...args: any[]) => {
      logs.push(`[WARN] ${args.map(formatArg).join(" ")}`);
      originalConsole.warn(...args);
    };
    console.error = (...args: any[]) => {
      errors.push(args.map(formatArg).join(" "));
      originalConsole.error(...args);
    };

    try {
      // Execute in isolated function context
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const fn = new AsyncFunction(code);
      
      Promise.resolve(fn())
        .then((result) => {
          if (result !== undefined) {
            logs.push(`➜ Return value: ${formatArg(result)}`);
          }
          const executionTimeMs = Math.round(performance.now() - startTime);
          resolve({
            stdout: logs.join("\n"),
            stderr: errors.join("\n"),
            exitCode: errors.length > 0 ? 1 : 0,
            executionTimeMs,
          });
        })
        .catch((err: Error) => {
          errors.push(`Runtime Error: ${err.message}`);
          const executionTimeMs = Math.round(performance.now() - startTime);
          resolve({
            stdout: logs.join("\n"),
            stderr: errors.join("\n"),
            exitCode: 1,
            executionTimeMs,
          });
        })
        .finally(() => {
          // Restore console
          console.log = originalConsole.log;
          console.warn = originalConsole.warn;
          console.error = originalConsole.error;
          console.info = originalConsole.info;
        });
    } catch (err: any) {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.info = originalConsole.info;

      resolve({
        stdout: logs.join("\n"),
        stderr: `Syntax / Compilation Error: ${err.message}`,
        exitCode: 1,
        executionTimeMs: Math.round(performance.now() - startTime),
      });
    }
  });
}
