import { useEffect, useState } from "react";
import { api } from "../api";

export default function MenuManager({ canEdit }) {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", category_id: "", price: 0, description: "" });

  const loadMenu = async () => {
    const { data } = await api.get("/menu");
    setCategories(data.categories);
    setItems(data.items);
    if (!form.category_id && data.categories.length) setForm((f) => ({ ...f, category_id: data.categories[0].id }));
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const addItem = async (e) => {
    e.preventDefault();
    await api.post("/menu/items", { ...form, price: Number(form.price) });
    setForm({ name: "", category_id: form.category_id, price: 0, description: "" });
    loadMenu();
  };

  return (
    <div className="grid two-col">
      <div className="card">
        <h3>Menu Items</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.category_name}</td>
                <td>${item.price}</td>
                <td>
                  <span className="pill">{item.is_available ? "Available" : "Hidden"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="card">
          <h3>Add Menu Item</h3>
          <form className="grid" onSubmit={addItem}>
            <label>
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>
              Category
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Price
              <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </label>
            <label>
              Description
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <button className="primary" type="submit">
              Save Item
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
