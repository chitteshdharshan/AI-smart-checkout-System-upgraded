const express = require("express");
const router = express.Router();
const { updateCart } = require("../controllers/cartController");

router.post("/update", updateCart);

module.exports = router;
