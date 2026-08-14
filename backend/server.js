const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const rateLimit = require('express-rate-limit');
const connectDB = require("./config/db");

dotenv.config();

// Connect MongoDB and sync FAISS catalog at startup
connectDB()
  .then(async () => {
    try {
      const Product = require("./models/Product");
      const { syncFaissCatalog } = require("./services/productEnrichmentService");

      // Populate category.name so the AI service receives 'Perfume' instead of
      // a raw ObjectId like '6a76d392f769151d079c2984', which would otherwise
      // corrupt the catalog embedding text and cause near-zero FAISS similarity.
      const rawProducts = await Product.find({ isActive: true })
        .populate("category", "name")
        .lean();

      // Flatten each product's category from { _id, name } to just its name string
      const products = rawProducts.map((p) => ({
        ...p,
        category: p.category?.name || p.category || "",
      }));

      if (products.length > 0) {
        await syncFaissCatalog(products);
        console.log(`[FAISS Startup] Synced ${products.length} catalog products to FAISS index.`);
      }
    } catch (err) {
      console.error("[FAISS Startup Sync Error]", err.message);
    }
  })
  .catch(err => console.error("[DB Connection] Failed:", err.message));

const app = express();

// ---------- Global Middleware ----------
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
      connectSrc: ["'self'", "http://localhost:5001", "http://ai-service:8000"],
      frameAncestors: ["'none'"],
    },
  },
}));
app.use(morgan("dev"));

// ---------- Rate Limiter for AI routes ----------
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 60, // allow 60 requests per window per IP
  message: { success: false, message: "Too many AI requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/ai', aiLimiter);

// ---------- Static folders ----------
app.use('/uploads', express.static(path.join(__dirname, "uploads")));
app.use('/uploads/captured', express.static(path.join(__dirname, "uploads/captured")));

// ---------- Test route ----------
app.get('/', (req, res) => {
  res.json({ success: true, message: "AI Smart Checkout Backend Running" });
});

// ---------- API Routes ----------
const authRoutes       = require("./routes/authRoutes");
const productRoutes    = require("./routes/productRoutes");
const aiRoutes         = require("./routes/aiRoutes");
const billingRoutes    = require("./routes/billingRoutes");
const cartRoutes       = require("./routes/cartRoutes");
const cameraRoutes     = require("./routes/cameraRoutes");
const categoryRoutes   = require("./routes/categoryRoutes");
const analyticsRoutes  = require("./routes/analyticsRoutes");

app.use("/api/auth",      authRoutes);
app.use("/api/products",  productRoutes);
app.use("/api/ai",        aiRoutes);
app.use("/api/billing",   billingRoutes);
app.use("/api/cart",      cartRoutes);
app.use("/api/camera",    cameraRoutes);
app.use("/api/categories",categoryRoutes);
app.use("/api/analytics", analyticsRoutes);

// ---------- 404 catch-all ----------
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ---------- Server start ----------
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
