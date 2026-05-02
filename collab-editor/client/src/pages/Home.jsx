import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { nanoid } from "nanoid";

export default function Home() {
  const [joinId, setJoinId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function handleCreate() {
    if (!name.trim()) return setError("Please enter your name");
    const roomId = nanoid(8);
    sessionStorage.setItem("userName", name.trim());
    navigate(`/room/${roomId}`);
  }

  function handleJoin(e) {
    e.preventDefault();
    if (!name.trim()) return setError("Please enter your name");
    if (!joinId.trim()) return setError("Please enter a room ID");
    sessionStorage.setItem("userName", name.trim());
    navigate(`/room/${joinId.trim()}`);
  }

  return (
    <div className="home-container">
      <div className="home-card">
        <div className="home-logo">
          <span className="logo-icon">{"</>"}</span>
        </div>
        <h1 className="home-title">CodeSync</h1>
        <p className="home-subtitle">Real-time collaborative code editor</p>

        {error && <p className="error-msg">{error}</p>}

        <div className="form-group">
          <label>Your name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder="e.g. Alex"
            className="input"
            maxLength={20}
          />
        </div>

        <button className="btn btn-primary" onClick={handleCreate}>
          + Create new room
        </button>

        <div className="divider"><span>or join existing</span></div>

        <form onSubmit={handleJoin} className="join-form">
          <input
            type="text"
            value={joinId}
            onChange={(e) => { setJoinId(e.target.value); setError(""); }}
            placeholder="Room ID"
            className="input"
          />
          <button type="submit" className="btn btn-secondary">Join →</button>
        </form>

        <p className="home-hint">
          Share the room link with teammates — they can join instantly, no sign-up needed.
        </p>
      </div>
    </div>
  );
}
