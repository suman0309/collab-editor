export default function UserList({ users, currentSocketId }) {
  return (
    <div className="user-list">
      <h3 className="sidebar-heading">Users ({users.length})</h3>
      <ul>
        {users.map((user) => (
          <li key={user.socketId} className="user-item">
            <span
              className="user-avatar"
              style={{ backgroundColor: user.color }}
            >
              {user.name[0].toUpperCase()}
            </span>
            <span className="user-name">
              {user.name}
              {user.socketId === currentSocketId && (
                <span className="you-badge"> (you)</span>
              )}
            </span>
            <span className="user-dot" style={{ backgroundColor: user.color }} />
          </li>
        ))}
      </ul>
    </div>
  );
}
