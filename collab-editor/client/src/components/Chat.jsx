import { useState, useEffect, useRef } from "react";

export default function Chat({ messages, onSend, currentUser }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="chat-panel">
      <h3 className="sidebar-heading">Chat</h3>
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">No messages yet. Say hi!</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-msg ${msg.sender === currentUser ? "own" : ""}`}
          >
            <div className="chat-meta">
              <span className="chat-sender" style={{ color: msg.color }}>
                {msg.sender}
              </span>
              <span className="chat-time">{formatTime(msg.timestamp)}</span>
            </div>
            <div className="chat-text">{msg.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message..."
          className="chat-input"
          maxLength={500}
        />
        <button onClick={handleSend} className="btn-send">Send</button>
      </div>
    </div>
  );
}
