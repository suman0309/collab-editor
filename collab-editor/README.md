# CodeSync — Real-time Collaborative Code Editor

A browser-based collaborative code editor where multiple users edit code together in real time.

---

## Features

**MCP (ready to ship):**
- Real-time multi-user editing via Socket.IO
- Monaco Editor (VS Code experience) with syntax highlighting
- Room system — create or join via ID
- Connected user list with color-coded avatars
- Typing indicators
- Language switcher (JS, TS, Python, C++, Java, Go, Rust)
- Share link — one click to invite collaborators
- In-room chat
- File tabs (multiple files per session)
- Save & reload sessions (MongoDB)
- Code execution via Judge0 (C++, Python, JS)
- Cursor tracking with user labels

---

## Tech Stack

| Layer     | Tech                              |
|-----------|-----------------------------------|
| Frontend  | React 18, Vite, Monaco Editor     |
| Realtime  | Socket.IO (WebSockets)            |
| Backend   | Node.js, Express                  |
| Database  | MongoDB (Mongoose)                |
| Execution | Judge0 via RapidAPI               |
| Deploy    | Vercel (frontend) + Render (backend) |

---

## Local Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd collab-editor

# Server
cd server && npm install

# Client
cd ../client && npm install
```

### 2. Configure env

**server/.env** (copy from `.env.example`):
```
PORT=3001
MONGODB_URI=mongodb+srv://...
JUDGE0_API_KEY=your-rapidapi-key
CLIENT_URL=http://localhost:5173
```

**client/.env** (copy from `.env.example`):
```
VITE_SERVER_URL=http://localhost:3001
```

### 3. Run

```bash
# Terminal 1 — server
cd server && npm run dev

# Terminal 2 — client
cd client && npm run dev
```

Open http://localhost:5173, create a room, and open it in a second tab to test collaboration.

---

## Getting Judge0 API Key (Code Execution)

1. Go to https://rapidapi.com/judge0-official/api/judge0-ce
2. Subscribe to the free tier (100 submissions/day)
3. Copy your **X-RapidAPI-Key** to server `.env`

---

## Deployment

### Backend → Render

1. Push code to GitHub
2. New Web Service on render.com → connect repo → set Root Dir to `server`
3. Build: `npm install` | Start: `npm start`
4. Add env vars in Render dashboard (MONGODB_URI, JUDGE0_API_KEY, CLIENT_URL)

### Frontend → Vercel

1. Import project on vercel.com → set Root Dir to `client`
2. Add env var: `VITE_SERVER_URL=https://your-render-app.onrender.com`
3. Deploy

### MongoDB Atlas (free tier)

1. Create cluster at mongodb.com/cloud/atlas
2. Create database user, whitelist 0.0.0.0/0 for Render
3. Copy connection string to MONGODB_URI

---

## Architecture

```
[Browser A] ─┐
[Browser B] ─┼── Socket.IO ──▶ [Node/Express Server] ──▶ [MongoDB]
[Browser C] ─┘                        │
                                       └──▶ [Judge0 API] (code execution)
```

**Room state** is stored in-memory on the server (a Map). Each room contains:
- Current code per file
- Connected users with colors
- Chat history (last 100 messages)
- Active language

Sessions are persisted to MongoDB on demand.

---

## Conflict Handling (Interview Explanation)

**Current approach:** debounced last-write-wins
- Code changes are debounced (80ms) before emitting
- Server broadcasts to all room members except sender
- Fine for 2–5 users editing different sections

**Operational Transformation (OT) — conceptual:**
Google Docs uses OT. Each edit is represented as an operation (insert/delete at position). When two users edit simultaneously, operations are *transformed* against each other so both edits apply correctly regardless of order. Libraries: `ot.js`, `ShareDB`.

**CRDTs — more modern:**
Yjs and Automerge use Conflict-free Replicated Data Types — a mathematical structure that merges concurrent edits without a central server. No server round-trips needed. Used by Notion, Figma.

**Why not implement full OT here?**
It's complex to implement correctly and the added latency from a single server is low enough that debouncing works at typical team sizes.

---

## Interview Talking Points

- WebSocket vs HTTP polling — persistent bidirectional connection, no repeated polling overhead
- Debounce strategy — reduces server load from 60 edits/s to ~12/s
- Room isolation — Socket.IO rooms ensure events only reach relevant clients  
- In-memory state — fast, but not horizontally scalable; upgrade to Redis pub/sub for multi-instance
- Monaco's `deltaDecorations` API for remote cursors — efficient, only updates changed decorations
- Judge0 sandboxing — untrusted code runs in isolated containers with resource limits
