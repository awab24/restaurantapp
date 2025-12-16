import { useEffect, useState } from "react";
import { api } from "../api";

export default function Reports() {
  const [sales, setSales] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [range, setRange] = useState({ from: "", to: "" });

  const load = async () => {
    const salesRes = await api.get("/reports/sales", { params: { from: range.from || null, to: range.to || null } });
    setSales(salesRes.data);
    const topRes = await api.get("/reports/top-items");
    setTopItems(topRes.data);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid two-col">
      <div className="card">
        <h3>Sales (Paid)</h3>
        <div className="grid two-col">
          <label>
            From
            <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          </label>
          <label>
            To
            <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
          </label>
          <button className="primary" onClick={load}>
            Run
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Day</th>
              <th>Revenue</th>
              <th>Orders</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.day}>
                <td>{s.day}</td>
                <td>${s.revenue}</td>
                <td>{s.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Top Items</h3>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Sales</th>
            </tr>
          </thead>
          <tbody>
            {topItems.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.total_qty}</td>
                <td>${t.total_sales}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
