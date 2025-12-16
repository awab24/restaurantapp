require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const db = require("./models/db");
const router = require("./routers/routers");

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("Restaurant backend running"));

app.get("/db-test", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS ok");
    res.json({ connected: true, result: rows });
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

app.use("/api", router);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
