export interface LanguageConfig {
  id: string;
  name: string;
  extension: string;
  monacoLanguage: string;
  pistonLanguage?: string;
  pistonVersion?: string;
  supportsExecution: boolean;
  defaultCode: string;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    id: "javascript",
    name: "JavaScript",
    extension: ".js",
    monacoLanguage: "javascript",
    pistonLanguage: "javascript",
    pistonVersion: "18.15.0",
    supportsExecution: true,
    defaultCode: `// CodeConnect — JavaScript Playground
// Real-time collaborative workspace

function calculatePrimes(max) {
  const primes = [];
  for (let i = 2; i <= max; i++) {
    let isPrime = true;
    for (let j = 2; j <= Math.sqrt(i); j++) {
      if (i % j === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) primes.push(i);
  }
  return primes;
}

console.log("🚀 Welcome to CodeConnect!");
const primes = calculatePrimes(30);
console.log("Primes up to 30:", primes);
console.log("Team collaboration active & live!");
`,
  },
  {
    id: "typescript",
    name: "TypeScript",
    extension: ".ts",
    monacoLanguage: "typescript",
    pistonLanguage: "typescript",
    pistonVersion: "5.0.3",
    supportsExecution: true,
    defaultCode: `// CodeConnect — TypeScript Playground

interface User {
  id: number;
  name: string;
  role: "admin" | "developer" | "student";
}

function greet(user: User): string {
  return \`👋 Hello, \${user.name}! Role: \${user.role.toUpperCase()}\`;
}

const developer: User = {
  id: 101,
  name: "Alex",
  role: "developer"
};

console.log(greet(developer));
`,
  },
  {
    id: "python",
    name: "Python",
    extension: ".py",
    monacoLanguage: "python",
    pistonLanguage: "python",
    pistonVersion: "3.10.0",
    supportsExecution: true,
    defaultCode: `# CodeConnect — Python Playground

def fibonacci(n):
    fib_series = [0, 1]
    while len(fib_series) < n:
        fib_series.append(fib_series[-1] + fib_series[-2])
    return fib_series

print("🐍 Python collaborative session initialized!")
series = fibonacci(10)
print(f"First 10 Fibonacci numbers: {series}")
`,
  },
  {
    id: "cpp",
    name: "C++",
    extension: ".cpp",
    monacoLanguage: "cpp",
    pistonLanguage: "cpp",
    pistonVersion: "10.2.0",
    supportsExecution: true,
    defaultCode: `// CodeConnect — C++ Playground
#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::cout << "⚡ Hello from C++ in CodeConnect!" << std::endl;
    std::vector<int> numbers = {10, 20, 30, 40, 50};
    int sum = 0;
    for (int n : numbers) {
        sum += n;
    }
    std::cout << "Sum of elements: " << sum << std::endl;
    return 0;
}
`,
  },
  {
    id: "c",
    name: "C",
    extension: ".c",
    monacoLanguage: "c",
    pistonLanguage: "c",
    pistonVersion: "10.2.0",
    supportsExecution: true,
    defaultCode: `// CodeConnect — C Playground
#include <stdio.h>

int main() {
    printf("✨ Welcome to CodeConnect C runner!\\n");
    int a = 42, b = 58;
    printf("Sum of %d + %d = %d\\n", a, b, a + b);
    return 0;
}
`,
  },
  {
    id: "java",
    name: "Java",
    extension: ".java",
    monacoLanguage: "java",
    pistonLanguage: "java",
    pistonVersion: "15.0.2",
    supportsExecution: true,
    defaultCode: `// CodeConnect — Java Playground
public class Main {
    public static void main(String[] args) {
        System.out.println("☕ Hello from collaborative Java!");
        String[] languages = {"Java", "Python", "JavaScript", "C++"};
        System.out.println("Supported languages in room: " + languages.length);
    }
}
`,
  },
  {
    id: "rust",
    name: "Rust",
    extension: ".rs",
    monacoLanguage: "rust",
    pistonLanguage: "rust",
    pistonVersion: "1.68.2",
    supportsExecution: true,
    defaultCode: `// CodeConnect — Rust Playground
fn main() {
    println!("🦀 Hello, Rusty Collaborators!");
    let numbers = vec![1, 2, 3, 4, 5];
    let squares: Vec<i32> = numbers.iter().map(|&x| x * x).collect();
    println!("Squares: {:?}", squares);
}
`,
  },
  {
    id: "go",
    name: "Go",
    extension: ".go",
    monacoLanguage: "go",
    pistonLanguage: "go",
    pistonVersion: "1.16.2",
    supportsExecution: true,
    defaultCode: `// CodeConnect — Go Playground
package main

import (
	"fmt"
	"time"
)

func main() {
	fmt.Println("🐹 Gopher collaboration active!")
	fmt.Printf("Current server time: %v\\n", time.Now().Format(time.RFC1123))
}
`,
  },
  {
    id: "html",
    name: "HTML",
    extension: ".html",
    monacoLanguage: "html",
    supportsExecution: true,
    defaultCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CodeConnect Preview</title>
  <style>
    body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
    .card { background: #1e293b; padding: 1.5rem; border-radius: 8px; border: 1px solid #334155; }
    h1 { color: #38bdf8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🚀 Hello HTML Preview!</h1>
    <p>This code is running in the CodeConnect sandbox.</p>
  </div>
</body>
</html>
`,
  },
  {
    id: "css",
    name: "CSS",
    extension: ".css",
    monacoLanguage: "css",
    supportsExecution: false,
    defaultCode: `/* CodeConnect — CSS Stylesheet */
:root {
  --primary: #3b82f6;
  --bg-dark: #0d1117;
  --text-main: #f3f4f6;
}

body {
  background-color: var(--bg-dark);
  color: var(--text-main);
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
  padding: 0;
}
`,
  },
  {
    id: "json",
    name: "JSON",
    extension: ".json",
    monacoLanguage: "json",
    supportsExecution: false,
    defaultCode: `{
  "name": "codeconnect-session",
  "version": "1.0.0",
  "collaborative": true,
  "realtime": true,
  "features": [
    "Monaco Editor",
    "Socket.IO Sync",
    "Multi-Language Execution",
    "Shareable Rooms"
  ]
}
`,
  },
  {
    id: "sql",
    name: "SQL",
    extension: ".sql",
    monacoLanguage: "sql",
    supportsExecution: false,
    defaultCode: `-- CodeConnect — SQL Queries
CREATE TABLE rooms (
    id VARCHAR(36) PRIMARY KEY,
    room_code VARCHAR(64) UNIQUE NOT NULL,
    language VARCHAR(32) DEFAULT 'javascript',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO rooms (id, room_code, language)
VALUES ('cuid_123', 'quantum-flux-882', 'python');

SELECT * FROM rooms ORDER BY created_at DESC;
`,
  },
  {
    id: "markdown",
    name: "Markdown",
    extension: ".md",
    monacoLanguage: "markdown",
    supportsExecution: false,
    defaultCode: `# 🚀 Welcome to CodeConnect

Collaborate in real time with classmates and developers.

## Features
- **Real-Time Synchronization** with sub-millisecond updates
- **12+ Supported Languages**
- **In-Browser Code Execution**
- **One-Click Shareable Links**

> Happy coding together!
`,
  },
];

export function getLanguageById(id: string): LanguageConfig {
  const found = SUPPORTED_LANGUAGES.find((lang) => lang.id === id);
  return found || SUPPORTED_LANGUAGES[0];
}

export function getFileExtension(languageId: string): string {
  return getLanguageById(languageId).extension;
}
