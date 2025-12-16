const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../models/db");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const hashPassword = (password) => bcrypt.hash(password, 10);
const comparePassword = (password, hash) => bcrypt.compare(password, hash);

const signToken = (user) =>
  jwt.sign(
    { id: user.id, role_id: user.role_id, role: user.role_name, email: user.email },
    JWT_SECRET,
    { expiresIn: "12h" }
  );

const initdb = async (_req, res) => {
  try {
    const schemaSql = `
      SET FOREIGN_KEY_CHECKS=0;
      DROP TABLE IF EXISTS payments, order_items, orders, reservations, menu_items, menu_categories, users, roles;
      SET FOREIGN_KEY_CHECKS=1;

      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(120) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(30),
        role_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id)
      );

      CREATE TABLE IF NOT EXISTS menu_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) UNIQUE NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS menu_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        is_available BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES menu_categories(id)
      );

      CREATE TABLE IF NOT EXISTS reservations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        reserved_for DATETIME NOT NULL,
        party_size INT NOT NULL,
        status ENUM('pending','confirmed','seated','cancelled','completed') DEFAULT 'pending',
        special_request TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        staff_id INT NULL,
        table_number VARCHAR(20),
        status ENUM('placed','in_progress','served','paid','cancelled') DEFAULT 'placed',
        total_amount DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES users(id),
        FOREIGN KEY (staff_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        menu_item_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        line_total DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
      );

      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        method ENUM('cash','card','online') DEFAULT 'cash',
        status ENUM('pending','paid','failed') DEFAULT 'pending',
        paid_at DATETIME,
        FOREIGN KEY (order_id) REFERENCES orders(id)
      );

      DROP PROCEDURE IF EXISTS sp_recalc_order_total;
      CREATE PROCEDURE sp_recalc_order_total(IN in_order_id INT)
      BEGIN
        UPDATE orders o
        SET total_amount = (
          SELECT IFNULL(SUM(line_total),0) FROM order_items oi WHERE oi.order_id = in_order_id
        )
        WHERE o.id = in_order_id;
      END;

      DROP TRIGGER IF EXISTS trg_order_items_after_ins;
      CREATE TRIGGER trg_order_items_after_ins
      AFTER INSERT ON order_items
      FOR EACH ROW
      BEGIN
        CALL sp_recalc_order_total(NEW.order_id);
      END;

      DROP TRIGGER IF EXISTS trg_order_items_after_upd;
      CREATE TRIGGER trg_order_items_after_upd
      AFTER UPDATE ON order_items
      FOR EACH ROW
      BEGIN
        CALL sp_recalc_order_total(NEW.order_id);
      END;

      DROP TRIGGER IF EXISTS trg_order_items_after_del;
      CREATE TRIGGER trg_order_items_after_del
      AFTER DELETE ON order_items
      FOR EACH ROW
      BEGIN
        CALL sp_recalc_order_total(OLD.order_id);
      END;

      DROP PROCEDURE IF EXISTS sp_sales_summary;
      CREATE PROCEDURE sp_sales_summary(IN fromDate DATE, IN toDate DATE)
      BEGIN
        SELECT DATE(o.created_at) as day, SUM(p.amount) as revenue
        FROM orders o
        JOIN payments p ON p.order_id = o.id AND p.status = 'paid'
        WHERE DATE(o.created_at) BETWEEN fromDate AND toDate
        GROUP BY DATE(o.created_at)
        ORDER BY day;
      END;

      DROP PROCEDURE IF EXISTS sp_top_items;
      CREATE PROCEDURE sp_top_items(IN limitN INT)
      BEGIN
        SELECT mi.id, mi.name, SUM(oi.quantity) AS total_qty, SUM(oi.line_total) AS total_sales
        FROM order_items oi
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        GROUP BY mi.id, mi.name
        ORDER BY total_qty DESC
        LIMIT limitN;
      END;
    `;

    await db.query(schemaSql);

    // seed roles and sample data
    await db.query(
      `
      INSERT IGNORE INTO roles (id, name) VALUES
        (1, 'admin'), (2, 'staff'), (3, 'customer');

      INSERT IGNORE INTO users (id, full_name, email, password_hash, phone, role_id) VALUES
        (1, 'Admin User', 'admin@demo.com', ?, '0000000000', 1),
        (2, 'Floor Staff', 'staff@demo.com', ?, '1111111111', 2),
        (3, 'Jane Customer', 'jane@demo.com', ?, '2222222222', 3);

      INSERT IGNORE INTO menu_categories (id, name) VALUES
        (1, 'Starters'), (2, 'Mains'), (3, 'Desserts'), (4, 'Drinks');

      INSERT IGNORE INTO menu_items (id, category_id, name, description, price) VALUES
        (1, 1, 'Bruschetta', 'Tomato, basil, toasted bread', 6.50),
        (2, 2, 'Grilled Salmon', 'Served with lemon butter sauce', 18.50),
        (3, 2, 'Steak Frites', 'Ribeye with fries', 22.00),
        (4, 3, 'Cheesecake', 'New York style', 7.00),
        (5, 4, 'House Lemonade', 'Freshly squeezed', 4.50);
    `,
      [await hashPassword("admin123"), await hashPassword("staff123"), await hashPassword("customer123")]
    );

    res.json({ ok: true, message: "Database initialized with schema, triggers, procedures, seed data." });
  } catch (err) {
    console.error("initdb failed", err);
    res.status(500).json({ ok: false, error: err.sqlMessage || err.message || String(err) });
  }
};

const register = async (req, res) => {
  try {
    const { full_name, email, password, phone, role = "customer" } = req.body;
    const [roleRow] = await db.query("SELECT id FROM roles WHERE name = ?", [role]);
    if (roleRow.length === 0) return res.status(400).json({ message: "Invalid role" });

    const password_hash = await hashPassword(password);
    const [result] = await db.query(
      "INSERT INTO users (full_name, email, password_hash, phone, role_id) VALUES (?,?,?,?,?)",
      [full_name, email, password_hash, phone || null, roleRow[0].id]
    );

    const token = signToken({ id: result.insertId, role_id: roleRow[0].id, role_name: role });
    res.status(201).json({ id: result.insertId, full_name, email, role, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await db.query(
      "SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE email = ?",
      [email]
    );
    if (users.length === 0) return res.status(401).json({ message: "Invalid credentials" });
    const user = users[0];
    const match = await comparePassword(password, user.password_hash);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken({ id: user.id, role_id: user.role_id, role_name: user.role_name, email: user.email });
    res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role_name } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

const requireRole = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
  next();
};

const listMenu = async (_req, res) => {
  try {
    const [categories] = await db.query("SELECT * FROM menu_categories ORDER BY name");
    const [items] = await db.query(
      "SELECT mi.*, mc.name AS category_name FROM menu_items mi JOIN menu_categories mc ON mc.id = mi.category_id ORDER BY mc.name, mi.name"
    );
    res.json({ categories, items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const [result] = await db.query("INSERT INTO menu_categories (name, description) VALUES (?,?)", [name, description || null]);
    res.status(201).json({ id: result.insertId, name, description });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createMenuItem = async (req, res) => {
  try {
    const { category_id, name, description, price, is_available = true } = req.body;
    const [result] = await db.query(
      "INSERT INTO menu_items (category_id, name, description, price, is_available) VALUES (?,?,?,?,?)",
      [category_id, name, description || null, price, is_available]
    );
    res.status(201).json({ id: result.insertId, category_id, name, description, price, is_available });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, name, description, price, is_available } = req.body;
    await db.query(
      "UPDATE menu_items SET category_id=?, name=?, description=?, price=?, is_available=? WHERE id=?",
      [category_id, name, description || null, price, is_available, id]
    );
    res.json({ id, category_id, name, description, price, is_available });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM menu_items WHERE id=?", [id]);
    res.json({ id, deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createReservation = async (req, res) => {
  try {
    const { customer_id, reserved_for, party_size, special_request } = req.body;
    const [result] = await db.query(
      "INSERT INTO reservations (customer_id, reserved_for, party_size, special_request) VALUES (?,?,?,?)",
      [customer_id, reserved_for, party_size, special_request || null]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const listReservations = async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, u.full_name, u.phone
       FROM reservations r
       JOIN users u ON u.id = r.customer_id
       ORDER BY r.reserved_for DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateReservationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await db.query("UPDATE reservations SET status=? WHERE id=?", [status, id]);
    res.json({ id, status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createOrder = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { customer_id, staff_id = null, table_number, items = [] } = req.body;
    const customerId = customer_id || req.user.id;
    if (!items.length) return res.status(400).json({ message: "Order requires items" });

    await conn.beginTransaction();
    const [orderResult] = await conn.query(
      "INSERT INTO orders (customer_id, staff_id, table_number, status) VALUES (?,?,?, 'placed')",
      [customerId, staff_id, table_number || null]
    );
    const orderId = orderResult.insertId;

    const itemIds = items.map((i) => i.menu_item_id);
    const [menuRows] = await conn.query("SELECT id, price FROM menu_items WHERE id IN (?)", [itemIds]);
    const priceMap = Object.fromEntries(menuRows.map((r) => [r.id, r.price]));

    for (const item of items) {
      const unit_price = priceMap[item.menu_item_id];
      const line_total = unit_price * item.quantity;
      await conn.query(
        "INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, line_total) VALUES (?,?,?,?,?)",
        [orderId, item.menu_item_id, item.quantity, unit_price, line_total]
      );
    }

    await conn.query("CALL sp_recalc_order_total(?)", [orderId]);
    await conn.commit();

    const [[orderRow]] = await conn.query("SELECT * FROM orders WHERE id = ?", [orderId]);
    res.status(201).json(orderRow);
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
};

const listOrders = async (req, res) => {
  try {
    const isStaff = ["admin", "staff"].includes(req.user?.role);
    const filter = isStaff ? "" : "WHERE o.customer_id = ?";
    const [orders] = await db.query(
      `SELECT o.*, c.full_name AS customer_name, s.full_name AS staff_name
       FROM orders o
       JOIN users c ON c.id = o.customer_id
       LEFT JOIN users s ON s.id = o.staff_id
       ${filter}
       ORDER BY o.created_at DESC`,
      isStaff ? [] : [req.user.id]
    );
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await db.query("UPDATE orders SET status=? WHERE id=?", [status, id]);
    res.json({ id, status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const recordPayment = async (req, res) => {
  try {
    const { order_id, amount, method = "cash" } = req.body;
    const [result] = await db.query(
      "INSERT INTO payments (order_id, amount, method, status, paid_at) VALUES (?,?,?,?,NOW())",
      [order_id, amount, method, "paid"]
    );
    await db.query("UPDATE orders SET status='paid' WHERE id=?", [order_id]);
    res.status(201).json({ id: result.insertId, order_id, amount, method });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const reportSales = async (req, res) => {
  try {
    const { from, to } = req.query;
    const [rows] = await db.query(
      `SELECT DATE(o.created_at) AS day, SUM(p.amount) AS revenue, COUNT(DISTINCT o.id) AS orders
       FROM orders o
       JOIN payments p ON p.order_id = o.id AND p.status='paid'
       WHERE (? IS NULL OR DATE(o.created_at) >= ?) AND (? IS NULL OR DATE(o.created_at) <= ?)
       GROUP BY DATE(o.created_at)
       ORDER BY day`,
      [from || null, from || null, to || null, to || null]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const reportTopItems = async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT mi.id, mi.name, SUM(oi.quantity) AS total_qty, SUM(oi.line_total) AS total_sales
       FROM order_items oi
       JOIN menu_items mi ON mi.id = oi.menu_item_id
       GROUP BY mi.id, mi.name
       ORDER BY total_qty DESC
       LIMIT 5`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  initdb,
  register,
  login,
  requireAuth,
  requireRole,
  listMenu,
  createCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createReservation,
  listReservations,
  updateReservationStatus,
  createOrder,
  listOrders,
  updateOrderStatus,
  recordPayment,
  reportSales,
  reportTopItems,
};
