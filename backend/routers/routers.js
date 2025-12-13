const express = require('express');

const router = express.Router();

const { initdb, insertIntoDb } = require("../controllers/controllers");

 router.post('/api/endpoints/initdb', initdb );
 router.post("/api/endpoints/users", insertIntoDb);

module.exports = router;