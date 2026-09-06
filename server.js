const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { loadEnvConfig } = require("@next/env");

// Load .env.local and .env into process.env
loadEnvConfig(process.cwd());

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory room state for lightning-fast real-time synchronization
// roomId -> { code: string, language: string, users: Map<socketId, User> }
const rooms = new Map();

function getOrInitRoom(roomId) {
  if (!rooms.has(roomId)) {
    const defaultCode =
      "// Welcome to Anil-code!\n// Collaborate on code and notes in real time.\n\nfunction helloWorld() {\n  console.log('Hello from Anil-code!');\n}\n\nhelloWorld();\n";

    rooms.set(roomId, {
      code: defaultCode,
      language: "javascript",
      users: new Map(),
    });
  }

  return rooms.get(roomId);
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    let currentRoomId = null;
    let currentUser = null;

    // Join room event
    socket.on("join-room", ({ roomId, user }) => {
      if (!roomId) return;
      currentRoomId = roomId;
      currentUser = {
        id: user?.id || socket.id,
        socketId: socket.id,
        name: user?.name || `User-${socket.id.slice(0, 4)}`,
        joinedAt: new Date().toISOString(),
      };

      socket.join(roomId);

      const roomData = getOrInitRoom(roomId);
      roomData.users.set(socket.id, currentUser);

      const usersList = Array.from(roomData.users.values());

      // Send initial state to joining user
      socket.emit("room-state", {
        roomId,
        code: roomData.code,
        language: roomData.language,
        users: usersList,
        lastUpdated: new Date().toISOString(),
      });

      // Broadcast to others in the room
      socket.to(roomId).emit("user-joined", {
        user: currentUser,
        users: usersList,
      });

      io.to(roomId).emit("users-update", usersList);
    });

    // Code change event
    socket.on("code-change", ({ roomId, code }) => {
      if (!roomId || code === undefined) return;
      const roomData = rooms.get(roomId);
      if (roomData) {
        roomData.code = code;
      }

      // Broadcast to other peers in room instantly
      socket.to(roomId).emit("code-update", {
        code,
        senderSocketId: socket.id,
        updatedAt: new Date().toISOString(),
      });
    });

    // Language change event
    socket.on("language-change", ({ roomId, language }) => {
      if (!roomId || !language) return;
      const roomData = rooms.get(roomId);
      if (roomData) {
        roomData.language = language;
      }

      // Broadcast language update to EVERYONE in room
      io.to(roomId).emit("language-update", {
        language,
        senderSocketId: socket.id,
      });
    });

    // Leave room explicitly
    socket.on("leave-room", ({ roomId }) => {
      handleLeave(roomId);
    });

    // Disconnect
    socket.on("disconnect", () => {
      if (currentRoomId) {
        handleLeave(currentRoomId);
      }
    });

    function handleLeave(roomId) {
      socket.leave(roomId);
      const roomData = rooms.get(roomId);
      if (roomData) {
        roomData.users.delete(socket.id);
        const usersList = Array.from(roomData.users.values());

        socket.to(roomId).emit("user-left", {
          user: currentUser,
          users: usersList,
        });
        socket.to(roomId).emit("users-update", usersList);
      }
    }
  });

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Anil-code Server ready on http://${hostname}:${port}`);
  });
});
