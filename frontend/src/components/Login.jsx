import { useState } from "react";
import { api, setToken } from "../api";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setToken(data.token);
      onLogin(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="app-shell">
      <div className="card" style={{ maxWidth: 420, margin: "60px auto" }}>
        <h2>Restaurant Admin</h2>
        <p>Login with seeded accounts or register first.</p>
        <form className="grid" onSubmit={submit}>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <div style={{ color: "red" }}>{error}</div>}
          <button type="submit" className="primary">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
