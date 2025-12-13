require("dotenv").config();

const express = require('express');
const app = express();
 const db = require("./models/db");


 

app.use(express.json());


const router = require("./routers/routers");

app.use(router);

 app.get("/", (req, res) => res.send("Backend is running 🚀"));

 
// Test DB connection route
app.get("/db-test", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    res.json({ connected: true, result: rows });
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

 
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
