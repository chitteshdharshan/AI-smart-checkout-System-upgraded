const express = require("express");
const router = express.Router();
const {
  calculateCart,
  processCheckout,
  getBillingHistory,
  getBillById,
} = require("../controllers/billingController");

router.post("/calculate", calculateCart);
router.post("/checkout", processCheckout);
router.get("/history", getBillingHistory);
router.get("/:id", getBillById);

module.exports = router;

