import { useEffect, useState } from "react";
import { api, setToken } from "./api";
import Login from "./components/Login";
import MenuManager from "./components/MenuManager";
import Reservations from "./components/Reservations";
import Orders from "./components/Orders";
import Reports from "./components/Reports";

const sections = ["menu", "orders", "reservations", "reports"];

export default function App() {
  const [user, setUser] = useState(null);
  const [section, setSection] = useState("menu");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const handleLogin = (data) => {
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("user");
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h2 style={{ margin: 0 }}>Hi {user.full_name}</h2>
          <small className="pill">{user.role}</small>
        </div>
        <button onClick={handleLogout}>Logout</button>
      </header>

      <div className="card nav">
        {sections.map((s) => (
          <button key={s} className={section === s ? "primary" : ""} onClick={() => setSection(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {section === "menu" && <MenuManager canEdit={["admin", "staff"].includes(user.role)} />}
      {section === "orders" && <Orders user={user} />}
      {section === "reservations" && <Reservations user={user} />}
      {section === "reports" && <Reports />}
    </div>
  );
}
