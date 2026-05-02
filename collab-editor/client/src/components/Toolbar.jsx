const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
];

export default function Toolbar({
  roomId, language, onLanguageChange,
  onRun, isRunning, onSave, isSaved,
  onShare, showChat, onToggleChat, currentUser,
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <span className="toolbar-logo">{"</>"} CodeSync</span>
        <span className="toolbar-room">
          Room: <code>{roomId}</code>
        </span>
      </div>

      <div className="toolbar-center">
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="lang-select"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>

        <button className="btn-run" onClick={onRun} disabled={isRunning}>
          {isRunning ? "⏳ Running..." : "▶ Run"}
        </button>
      </div>

      <div className="toolbar-right">
        <button className="btn-icon" onClick={onSave} title="Save session">
          {isSaved ? "✓ Saved" : "💾 Save"}
        </button>
        <button className="btn-icon" onClick={onShare} title="Copy share link">
          🔗 Share
        </button>
        <button className="btn-icon" onClick={onToggleChat} title="Toggle chat">
          {showChat ? "💬 Chat" : "💬"}
        </button>
        {currentUser && (
          <span className="current-user" style={{ backgroundColor: currentUser.color }}>
            {currentUser.name[0].toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}
