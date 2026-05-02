export default function OutputPanel({ output, onClose }) {
  const hasError = output.stderr && output.stderr.trim();
  const hasOutput = output.stdout && output.stdout.trim();

  return (
    <div className="output-panel">
      <div className="output-header">
        <span className={`output-status ${hasError ? "error" : "ok"}`}>
          {output.status}
          {output.time && ` · ${output.time}s`}
          {output.memory && ` · ${(output.memory / 1024).toFixed(1)}MB`}
        </span>
        <button className="output-close" onClick={onClose}>✕</button>
      </div>
      <div className="output-body">
        {hasOutput && (
          <pre className="output-stdout">{output.stdout}</pre>
        )}
        {hasError && (
          <pre className="output-stderr">{output.stderr}</pre>
        )}
        {!hasOutput && !hasError && (
          <p className="output-empty">No output</p>
        )}
      </div>
    </div>
  );
}
