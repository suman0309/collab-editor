export default function FileTabs({ files, activeFile, onSwitch, onAdd }) {
  return (
    <div className="file-tabs">
      {files.map((file) => (
        <button
          key={file.id}
          className={`file-tab ${file.id === activeFile ? "active" : ""}`}
          onClick={() => onSwitch(file.id)}
        >
          {file.name}
        </button>
      ))}
      <button className="file-tab file-tab-add" onClick={onAdd} title="Add new file">
        +
      </button>
    </div>
  );
}
