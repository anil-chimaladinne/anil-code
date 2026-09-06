"use client";

import { useEffect, useRef } from "react";
import Editor, { OnMount, BeforeMount } from "@monaco-editor/react";
import { getLanguageById } from "@/lib/languages";

interface MonacoCodeEditorProps {
  code: string;
  language: string;
  theme?: string;
  fontSize?: number;
  wordWrap?: "on" | "off";
  minimap?: boolean;
  tabSize?: number;
  onChange: (newCode: string) => void;
  onCursorChange?: (position: { lineNumber: number; column: number }) => void;
}

export function MonacoCodeEditor({
  code,
  language,
  theme = "vs-dark",
  fontSize = 14,
  wordWrap = "on",
  minimap = true,
  tabSize = 2,
  onChange,
  onCursorChange,
}: MonacoCodeEditorProps) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  const langConfig = getLanguageById(language);

  const handleEditorWillMount: BeforeMount = (monaco) => {
    monacoRef.current = monaco;

    // Define custom dark modern themes
    monaco.editor.defineTheme("codeconnect-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6e7681", fontStyle: "italic" },
        { token: "keyword", foreground: "ff7b72" },
        { token: "string", foreground: "a5d6ff" },
        { token: "number", foreground: "79c0ff" },
        { token: "type", foreground: "ffa657" },
        { token: "function", foreground: "d2a8ff" },
      ],
      colors: {
        "editor.background": "#0d1117",
        "editor.foreground": "#e6edf3",
        "editor.lineHighlightBackground": "#161b22",
        "editorLineNumber.foreground": "#484f58",
        "editorLineNumber.activeForeground": "#f0f6fc",
        "editorCursor.foreground": "#58a6ff",
        "editor.selectionBackground": "#1f6feb40",
        "editor.inactiveSelectionBackground": "#1f6feb20",
      },
    });
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Listen to cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        onCursorChange({
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        });
      }
    });

    // Auto layout on resize
    window.addEventListener("resize", () => {
      editor.layout();
    });
  };

  // Re-layout when props change
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.layout();
    }
  }, [minimap, wordWrap, fontSize]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0d1117]">
      <Editor
        height="100%"
        width="100%"
        language={langConfig.monacoLanguage}
        value={code}
        theme={theme === "vs-dark" ? "codeconnect-dark" : theme}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        onChange={(val) => {
          onChange(val || "");
        }}
        options={{
          fontSize,
          wordWrap,
          tabSize,
          minimap: { enabled: minimap },
          automaticLayout: true,
          fontFamily:
            "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
          fontLigatures: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          lineNumbers: "on",
          lineNumbersMinChars: 3,
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: "all",
          contextmenu: true,
        }}
        loading={
          <div className="flex h-full w-full items-center justify-center bg-[#0d1117] text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <span>Loading Monaco Editor...</span>
            </div>
          </div>
        }
      />
    </div>
  );
}
