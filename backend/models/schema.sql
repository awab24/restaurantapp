-- Schema and seed data for Restaurant App
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

INSERT IGNORE INTO roles (id, name) VALUES
  (1, 'admin'), (2, 'staff'), (3, 'customer');

INSERT IGNORE INTO users (id, full_name, email, password_hash, phone, role_id) VALUES
  (1, 'Admin User', 'admin@demo.com', '$2a$10$abcdefghijklmnopqrstuv', '0000000000', 1);

INSERT IGNORE INTO menu_categories (id, name) VALUES
  (1, 'Starters'), (2, 'Mains'), (3, 'Desserts'), (4, 'Drinks');

INSERT IGNORE INTO menu_items (id, category_id, name, description, price) VALUES
  (1, 1, 'Bruschetta', 'Tomato, basil, toasted bread', 6.50),
  (2, 2, 'Grilled Salmon', 'Served with lemon butter sauce', 18.50),
  (3, 2, 'Steak Frites', 'Ribeye with fries', 22.00),
  (4, 3, 'Cheesecake', 'New York style', 7.00),
  (5, 4, 'House Lemonade', 'Freshly squeezed', 4.50);
