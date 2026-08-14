const express = require("express");
const router = express.Router();
const {
  getDashboardSummary,
  getSalesTrends,
  getLowStockAlerts,
  exportSalesCSV,
} = require("../controllers/analyticsController");

router.get("/summary", getDashboardSummary);
router.get("/sales-trends", getSalesTrends);
router.get("/low-stock", getLowStockAlerts);
router.get("/export/csv", exportSalesCSV);

module.exports = router;
