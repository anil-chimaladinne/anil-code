# 🚀 CodeConnect — Modern Real-Time Code Sharing Platform

> **Share code. Collaborate instantly.**
> A fast, lightweight, and modern browser-based code sharing and pair-programming platform inspired by CodeShare.

![CodeConnect Banner](https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80)

---

## ✨ Features

- ⚡ **Instant Real-Time Collaboration**: Sub-millisecond WebSocket synchronization via Socket.IO with conflict-free editing.
- 💻 **Monaco Code Editor**: VS Code-powered editor supporting syntax highlighting, minimap, formatting, line numbers, word wrap, and themes.
- 🌐 **12+ Supported Languages**: JavaScript, TypeScript, Python, C, C++, Java, Rust, Go, HTML, CSS, JSON, SQL, and Markdown.
- 🚀 **In-Browser & Multi-Language Code Execution**: Client-side sandboxed JS engine + remote multi-language sandbox with live output, errors, and HTML preview.
- 🔗 **Instant Room Sharing**: 1-click room creation with unique, readable room codes and native Web Share API support.
- 👥 **Live Presence & Custom Avatars**: See connected developers live with colored badges, custom display names, and active status.
- 💾 **Auto-Saving Database Persistence**: Built with Prisma ORM and SQLite (zero-config local) / PostgreSQL ready.
- 📦 **1-Click Copy & Export**: Download code with auto-matched file extensions (`.py`, `.js`, `.cpp`, `.java`, etc.).

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Lucide Icons.
- **Code Editor**: `@monaco-editor/react` (Monaco Editor engine).
- **Real-Time Backend**: Node.js HTTP Server + Socket.IO.
- **Database / ORM**: Prisma ORM with SQLite (or PostgreSQL).
- **Execution Engine**: Sandboxed Web Worker for JS & Piston Multi-Language API.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18.15+ installed.
- npm or yarn.

### 2. Installation

Clone or open the project folder:

```bash
cd codeconnect
npm install
```

### 3. Setup Database

Initialize the Prisma SQLite database:

```bash
npx prisma db push
```

### 4. Run the Application

Start the unified Next.js + Socket.IO server:

```bash
npm run dev
```

Visit **`http://localhost:3000`** in your browser!

---

## 📁 Project Structure

```text
codeconnect/
├── app/
│   ├── layout.tsx              # Root layout & theme config
│   ├── page.tsx                # Hero landing page
│   ├── join/
│   │   └── page.tsx            # Join room by link or ID
│   ├── room/[roomId]/
│   │   └── page.tsx            # Real-time collaborative IDE workspace
│   └── api/
│       ├── rooms/
│       │   ├── route.ts        # POST: Create room, GET: recent rooms
│       │   └── [roomId]/
│       │       └── route.ts    # Room queries & updates
│       └── execute/
│           └── route.ts        # Multi-language code execution runner
├── components/
│   ├── landing/                # Navbar, Hero, FeatureCards, HowItWorks, Footer
│   ├── editor/                 # MonacoCodeEditor, EditorToolbar, OutputPanel, StatusBar
│   └── room/                   # RoomHeader, ShareModal, UserPresence, SettingsModal
├── lib/
│   ├── prisma.ts               # Prisma ORM client singleton
│   ├── languages.ts            # Language configs, boilerplates & extensions
│   ├── execution.ts            # JS sandbox & multi-language execution service
│   ├── socket-client.ts        # Socket.IO client connection & state management
│   └── utils.ts                # Room ID generator, user badges & helpers
├── prisma/
│   └── schema.prisma           # Prisma schema for Room models
├── server.js                   # Unified custom Next.js + Socket.IO server
└── README.md
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# Database connection (SQLite default or PostgreSQL)
DATABASE_URL="file:./dev.db"

# Server Port
PORT=3000

# Public URL of the application
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

---

## 🧪 Testing Checklist

- [x] **Room Creation**: One-click generation of unique room IDs.
- [x] **Room Joining**: Connect via `/join` or direct shareable URL.
- [x] **Live Real-Time Sync**: Open two tabs with the same room URL and watch code update in real-time.
- [x] **Multi-Language Selector**: Switching language automatically switches syntax highlighting and templates.
- [x] **Code Execution**: Run JavaScript or Python and observe output and execution time.
- [x] **Code Download**: Export code as `.js`, `.py`, `.cpp`, etc.
- [x] **User Presence**: Live avatars with name and color customization.

---

## 📄 License
MIT License. Built for modern developer collaboration.
