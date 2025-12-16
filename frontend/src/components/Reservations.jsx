import { useEffect, useState } from "react";
import { api } from "../api";

export default function Reservations({ user }) {
  const [reservations, setReservations] = useState([]);
  const [form, setForm] = useState({
    reserved_for: "",
    party_size: 2,
    special_request: "",
  });

  const load = async () => {
    if (["admin", "staff"].includes(user.role)) {
      const { data } = await api.get("/reservations");
      setReservations(data);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createReservation = async (e) => {
    e.preventDefault();
    await api.post("/reservations", {
      ...form,
      customer_id: user.id,
    });
    setForm({ reserved_for: "", party_size: 2, special_request: "" });
    load();
  };

  const setStatus = async (id, status) => {
    await api.patch(`/reservations/${id}/status`, { status });
    load();
  };

  return (
    <div className="grid two-col">
      <div className="card">
        <h3>Create Reservation</h3>
        <form className="grid" onSubmit={createReservation}>
          <label>
            Date/Time
            <input
              type="datetime-local"
              value={form.reserved_for}
              onChange={(e) => setForm({ ...form, reserved_for: e.target.value })}
              required
            />
          </label>
          <label>
            Party size
            <input
              type="number"
              min="1"
              value={form.party_size}
              onChange={(e) => setForm({ ...form, party_size: Number(e.target.value) })}
            />
          </label>
          <label>
            Special request
            <textarea value={form.special_request} onChange={(e) => setForm({ ...form, special_request: e.target.value })} />
          </label>
          <button className="primary" type="submit">
            Save Reservation
          </button>
        </form>
      </div>

      {["admin", "staff"].includes(user.role) && (
        <div className="card">
          <h3>Upcoming Reservations</h3>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>For</th>
                <th>Size</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id}>
                  <td>{r.full_name}</td>
                  <td>{new Date(r.reserved_for).toLocaleString()}</td>
                  <td>{r.party_size}</td>
                  <td>
                    <span className="pill">{r.status}</span>
                  </td>
                  <td>
                    <button onClick={() => setStatus(r.id, "confirmed")}>Confirm</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
