const db = require("../models/db");


  const initdb = async  () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✅ users table ready");
}


  const insertIntoDb = async function (req, res) {
      const { name, email } = req.body;

  const [result] = await db.query(
    "INSERT INTO users (name, email) VALUES (?, ?)",
    [name, email]
  );

  res.status(201).json({ id: result.insertId, name, email });
}

 module.exports = { initdb, insertIntoDb };