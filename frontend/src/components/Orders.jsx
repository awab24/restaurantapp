import { useEffect, useState } from "react";
import { api } from "../api";

export default function Orders({ user }) {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [items, setItems] = useState([{ menu_item_id: "", quantity: 1 }]);
  const [tableNumber, setTableNumber] = useState("");

  const load = async () => {
    const { data } = await api.get("/menu");
    setMenuItems(data.items);
    const ordersRes = await api.get("/orders");
    setOrders(ordersRes.data);
  };

  useEffect(() => {
    load();
  }, []);

  const updateItem = (idx, key, value) => {
    const next = [...items];
    next[idx][key] = value;
    setItems(next);
  };

  const addRow = () => setItems([...items, { menu_item_id: "", quantity: 1 }]);

  const createOrder = async (e) => {
    e.preventDefault();
    const payload = {
      customer_id: user.id,
      table_number: tableNumber,
      items: items.filter((i) => i.menu_item_id),
    };
    await api.post("/orders", payload);
    setItems([{ menu_item_id: "", quantity: 1 }]);
    setTableNumber("");
    load();
  };

  return (
    <div className="grid two-col">
      <div className="card">
        <h3>Orders</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>{o.customer_name}</td>
                <td>
                  <span className="pill">{o.status}</span>
                </td>
                <td>${o.total_amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Create Order</h3>
        <form className="grid" onSubmit={createOrder}>
          <label>
            Table #
            <input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} />
          </label>
          {items.map((it, idx) => (
            <div key={idx} className="grid two-col" style={{ alignItems: "center" }}>
              <select value={it.menu_item_id} onChange={(e) => updateItem(idx, "menu_item_id", Number(e.target.value))}>
                <option value="">Select item</option>
                {menuItems.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (${m.price})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={it.quantity}
                onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
              />
            </div>
          ))}
          <button type="button" onClick={addRow}>
            + Add Item
          </button>
          <button type="submit" className="primary">
            Save Order
          </button>
        </form>
      </div>
    </div>
  );
}
