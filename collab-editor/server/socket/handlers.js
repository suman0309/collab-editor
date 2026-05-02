// In-memory room state (upgrade to Redis for production scale)
const rooms = new Map();
// roomId -> { users: Map<socketId, {name, color}>, code: string, language: string, chat: [] }

const USER_COLORS = [
  "#E8593C", "#3B8BD4", "#1D9E75", "#BA7517",
  "#7F77DD", "#D4537E", "#639922", "#D85A30",
];

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: new Map(),
      code: "// Start coding here...\n",
      language: "javascript",
      chat: [],
      files: [{ id: "main", name: "main.js", code: "// Start coding here...\n" }],
      activeFile: "main",
    });
  }
  return rooms.get(roomId);
}

function assignColor(roomId) {
  const room = getRoom(roomId);
  const usedColors = new Set([...room.users.values()].map((u) => u.color));
  return USER_COLORS.find((c) => !usedColors.has(c)) || USER_COLORS[0];
}

function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // ── JOIN ROOM ──────────────────────────────────────────────
    socket.on("join-room", ({ roomId, userName }) => {
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.userName = userName;

      const room = getRoom(roomId);
      const color = assignColor(roomId);
      room.users.set(socket.id, { name: userName, color, cursor: null });

      // Send current state to the new user
      socket.emit("room-state", {
        code: room.code,
        language: room.language,
        users: usersArray(room),
        chat: room.chat,
        files: room.files,
        activeFile: room.activeFile,
      });

      // Notify others
      socket.to(roomId).emit("user-joined", {
        socketId: socket.id,
        name: userName,
        color,
      });

      io.to(roomId).emit("users-updated", usersArray(room));
      console.log(`${userName} joined room ${roomId}`);
    });

    // ── CODE CHANGE ────────────────────────────────────────────
    socket.on("code-change", ({ roomId, code, fileId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      if (fileId) {
        const file = room.files.find((f) => f.id === fileId);
        if (file) file.code = code;
        // Sync active file code to room.code for backward compat
        if (fileId === room.activeFile) room.code = code;
      } else {
        room.code = code;
      }

      // Broadcast to everyone else in the room
      socket.to(roomId).emit("code-change", { code, fileId, senderId: socket.id });
    });

    // ── LANGUAGE CHANGE ────────────────────────────────────────
    socket.on("language-change", ({ roomId, language }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      room.language = language;
      io.to(roomId).emit("language-change", { language });
    });

    // ── CURSOR MOVE ────────────────────────────────────────────
    socket.on("cursor-move", ({ roomId, position }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const user = room.users.get(socket.id);
      if (user) user.cursor = position;
      socket.to(roomId).emit("cursor-move", {
        socketId: socket.id,
        position,
        color: user?.color,
        name: user?.name,
      });
    });

    // ── TYPING INDICATOR ───────────────────────────────────────
    socket.on("typing", ({ roomId, isTyping }) => {
      const room = rooms.get(roomId);
      const user = room?.users.get(socket.id);
      socket.to(roomId).emit("typing", {
        socketId: socket.id,
        name: user?.name,
        isTyping,
      });
    });

    // ── CHAT ───────────────────────────────────────────────────
    socket.on("chat-message", ({ roomId, message }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const user = room.users.get(socket.id);
      const msg = {
        id: Date.now(),
        text: message,
        sender: user?.name || "Anonymous",
        color: user?.color,
        timestamp: new Date().toISOString(),
      };
      room.chat.push(msg);
      // Keep last 100 messages
      if (room.chat.length > 100) room.chat.shift();
      io.to(roomId).emit("chat-message", msg);
    });

    // ── FILE TABS ──────────────────────────────────────────────
    socket.on("add-file", ({ roomId, file }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      room.files.push(file);
      io.to(roomId).emit("file-added", file);
    });

    socket.on("switch-file", ({ roomId, fileId }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      room.activeFile = fileId;
      socket.to(roomId).emit("switch-file", { fileId });
    });

    // ── SAVE SESSION ───────────────────────────────────────────
    socket.on("save-session", async ({ roomId }) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return;
        const Session = require("../models/Session");
        await Session.findOneAndUpdate(
          { roomId },
          { code: room.code, language: room.language, files: room.files, updatedAt: new Date() },
          { upsert: true, new: true }
        );
        socket.emit("session-saved", { success: true });
      } catch (err) {
        socket.emit("session-saved", { success: false, error: err.message });
      }
    });

    // ── DISCONNECT ─────────────────────────────────────────────
    socket.on("disconnect", () => {
      const { roomId, userName } = socket.data;
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (room) {
        room.users.delete(socket.id);
        io.to(roomId).emit("user-left", { socketId: socket.id, name: userName });
        io.to(roomId).emit("users-updated", usersArray(room));

        // Clean up empty rooms after 10 min
        if (room.users.size === 0) {
          setTimeout(() => {
            if (rooms.get(roomId)?.users.size === 0) rooms.delete(roomId);
          }, 10 * 60 * 1000);
        }
      }
      console.log(`${userName} left room ${roomId}`);
    });
  });
}

function usersArray(room) {
  return [...room.users.entries()].map(([socketId, data]) => ({ socketId, ...data }));
}

module.exports = { registerSocketHandlers };
