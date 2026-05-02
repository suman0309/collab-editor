import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MonacoEditor from "@monaco-editor/react";
import { useSocket } from "../hooks/useSocket";
import UserList from "../components/UserList";
import Chat from "../components/Chat";
import FileTabs from "../components/FileTabs";
import OutputPanel from "../components/OutputPanel";
import Toolbar from "../components/Toolbar";
import axios from "axios";

const DEBOUNCE_MS = 80; // ms to debounce code updates

export default function Editor() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const editorRef = useRef(null);
  const debounceTimer = useRef(null);
  const isRemoteChange = useRef(false);

  const userName = sessionStorage.getItem("userName") || "Anonymous";

  const [code, setCode] = useState("// Loading...");
  const [language, setLanguage] = useState("javascript");
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [files, setFiles] = useState([{ id: "main", name: "main.js", code: "// Start coding here...\n" }]);
  const [activeFile, setActiveFile] = useState("main");
  const [showChat, setShowChat] = useState(true);
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [decorations, setDecorations] = useState([]);

  // Join room on mount
  useEffect(() => {
    if (!sessionStorage.getItem("userName")) {
      navigate("/");
      return;
    }

    socket.emit("join-room", { roomId, userName });

    socket.on("room-state", ({ code, language, users, chat, files: f, activeFile: af }) => {
      setCode(code);
      setLanguage(language);
      setUsers(users);
      setChatMessages(chat);
      if (f) setFiles(f);
      if (af) setActiveFile(af);
    });

    socket.on("users-updated", setUsers);

    socket.on("code-change", ({ code: newCode, fileId, senderId }) => {
      if (senderId === socket.id) return;
      isRemoteChange.current = true;
      if (fileId === activeFile || !fileId) {
        setCode(newCode);
        setFiles((prev) => prev.map((f) => (f.id === (fileId || activeFile) ? { ...f, code: newCode } : f)));
      }
    });

    socket.on("language-change", ({ language }) => setLanguage(language));

    socket.on("typing", ({ socketId, name, isTyping }) => {
      setTypingUsers((prev) =>
        isTyping
          ? prev.includes(name) ? prev : [...prev, name]
          : prev.filter((n) => n !== name)
      );
    });

    socket.on("chat-message", (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on("cursor-move", ({ socketId, position, color, name }) => {
      if (!editorRef.current || !position) return;
      const monaco = window.monaco;
      if (!monaco) return;

      const newDecoration = {
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column + 1),
        options: {
          className: `cursor-decoration`,
          afterContentClassName: `cursor-label`,
          hoverMessage: { value: name },
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          after: { content: ` ${name}`, inlineClassName: "cursor-name-inline" },
          overviewRuler: { color, position: monaco.editor.OverviewRulerLane.Right },
        },
      };

      setDecorations((prev) => {
        const filtered = prev.filter((d) => d.socketId !== socketId);
        return [...filtered, { socketId, decoration: newDecoration, color }];
      });
    });

    socket.on("file-added", (file) => setFiles((prev) => [...prev, file]));
    socket.on("switch-file", ({ fileId }) => switchToFile(fileId));
    socket.on("session-saved", ({ success }) => success && setIsSaved(true));

    return () => {
      socket.off("room-state");
      socket.off("users-updated");
      socket.off("code-change");
      socket.off("language-change");
      socket.off("typing");
      socket.off("chat-message");
      socket.off("cursor-move");
      socket.off("file-added");
      socket.off("switch-file");
      socket.off("session-saved");
    };
  }, [roomId]);

  // Sync decorations to editor
  useEffect(() => {
    if (!editorRef.current || !decorations.length) return;
    const allDecs = decorations.map((d) => d.decoration);
    editorRef.current.deltaDecorations([], allDecs);
  }, [decorations]);

  const handleCodeChange = useCallback((newCode) => {
    if (isRemoteChange.current) {
      isRemoteChange.current = false;
      return;
    }
    setCode(newCode);
    setFiles((prev) => prev.map((f) => (f.id === activeFile ? { ...f, code: newCode } : f)));
    setIsSaved(false);

    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      socket.emit("code-change", { roomId, code: newCode, fileId: activeFile });
    }, DEBOUNCE_MS);

    // Typing indicator
    socket.emit("typing", { roomId, isTyping: true });
    clearTimeout(window._typingTimer);
    window._typingTimer = setTimeout(() => socket.emit("typing", { roomId, isTyping: false }), 1500);
  }, [roomId, activeFile]);

  function handleLanguageChange(lang) {
    setLanguage(lang);
    socket.emit("language-change", { roomId, language: lang });
  }

  function handleCursorChange(e) {
    if (!e?.position) return;
    socket.emit("cursor-move", { roomId, position: e.position });
  }

  function handleEditorMount(editor, monaco) {
    editorRef.current = editor;
    window.monaco = monaco;
    editor.onDidChangeCursorPosition(handleCursorChange);
  }

  function switchToFile(fileId) {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;
    setActiveFile(fileId);
    setCode(file.code);
  }

  function handleSwitchFile(fileId) {
    switchToFile(fileId);
    socket.emit("switch-file", { roomId, fileId });
  }

  function handleAddFile() {
    const name = prompt("File name (e.g. utils.py):");
    if (!name) return;
    const { nanoid } = require("nanoid");
    const file = { id: nanoid(6), name, code: "" };
    setFiles((prev) => [...prev, file]);
    socket.emit("add-file", { roomId, file });
    handleSwitchFile(file.id);
  }

  function handleSaveSession() {
    socket.emit("save-session", { roomId });
  }

  async function handleRunCode() {
    setIsRunning(true);
    setOutput(null);
    try {
      const { data } = await axios.post("/api/run", { code, language });
      setOutput(data);
    } catch (err) {
      setOutput({ stderr: err.response?.data?.error || "Execution failed", status: "Error" });
    } finally {
      setIsRunning(false);
    }
  }

  function handleShareLink() {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied to clipboard!");
  }

  const currentUser = users.find((u) => u.socketId === socket.id);

  return (
    <div className="editor-layout">
      <Toolbar
        roomId={roomId}
        language={language}
        onLanguageChange={handleLanguageChange}
        onRun={handleRunCode}
        isRunning={isRunning}
        onSave={handleSaveSession}
        isSaved={isSaved}
        onShare={handleShareLink}
        showChat={showChat}
        onToggleChat={() => setShowChat((v) => !v)}
        currentUser={currentUser}
      />

      <FileTabs
        files={files}
        activeFile={activeFile}
        onSwitch={handleSwitchFile}
        onAdd={handleAddFile}
      />

      <div className="editor-body">
        <div className="editor-main">
          <MonacoEditor
            height="100%"
            language={language}
            value={code}
            onChange={handleCodeChange}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: "smooth",
              formatOnPaste: true,
              automaticLayout: true,
              lineNumbers: "on",
              wordWrap: "off",
              tabSize: 2,
            }}
          />

          {output && (
            <OutputPanel output={output} onClose={() => setOutput(null)} />
          )}

          {typingUsers.length > 0 && (
            <div className="typing-indicator">
              {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
            </div>
          )}
        </div>

        <div className={`editor-sidebar ${showChat ? "open" : "collapsed"}`}>
          <UserList users={users} currentSocketId={socket.id} />
          {showChat && (
            <Chat
              messages={chatMessages}
              onSend={(msg) => socket.emit("chat-message", { roomId, message: msg })}
              currentUser={userName}
            />
          )}
        </div>
      </div>
    </div>
  );
}
