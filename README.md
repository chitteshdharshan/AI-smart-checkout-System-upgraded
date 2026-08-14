# 🛒 AI-Powered Smart Autonomous Checkout System

> **Enterprise Real-Time AI Retail Recognition, Vision Language Pipeline, FAISS Vector Search, and Autonomous Billing Platform**

---

## 🌟 Architecture & System Pipeline

The system processes real-time HD video streams through an 8-stage AI vision and billing pipeline:

```text
  Customer Places Products
             │
             ▼
    HD Camera Capture (1280x720)
             │
             ▼
    YOLOv8 Object Detection & Bounding Boxes
             │
             ▼
    Crop Individual Product Images
             │
             ▼
    EasyOCR Optical Character Recognition
             │
             ▼
    Vision Language Model (Qwen2.5-VL Structured Extraction)
             │
             ▼
    SentenceTransformer Dense Vectors & FAISS Nearest-Neighbor Search
             │
             ▼
    Automatic Shopping Cart Population & Duplicates Merging
             │
             ▼
    Billing Engine (Subtotal, 5% GST Tax, Discounts, Grand Total)
             │
             ▼
    Atomic Inventory Deduction & Digital Tax Invoice Receipt
             │
             ▼
    Executive Admin Dashboard Analytics & CSV Export
```

---

## 🚀 Key Modules & Capabilities

1. **Phase 1-2**: JWT Authentication, Role Management (Admin/Cashier), Mongo Database Integration, and Product Catalog Management.
2. **Phase 3**: HD Camera Capture (1280x720 canvas resolution), facing mode toggle, multi-product basket capture mode, and audit logs.
3. **Phase 4**: Ultralytics YOLOv8 product detection, visual bounding boxes, auto-cropping, and annotated image generation.
4. **Phase 5**: EasyOCR text extraction and text normalization (`clean_ocr_text` / `clean_ocr_lines`).
5. **Phase 6**: Vision Language Model (VLM) structured product metadata extraction (`brand`, `product_name`, `flavor`, `weight`, `category`, `confidence`).
6. **Phase 7**: `SentenceTransformer` (`all-MiniLM-L6-v2`) 384-dimensional dense embeddings and FAISS nearest-neighbor vector search against MongoDB catalog items.
7. **Phase 8**: AI Smart Cart & Billing Engine with line-item calculations, 5% GST tax, atomic stock deduction, and digital printable receipts.
8. **Phase 9**: Executive Admin Dashboard (`KPICards`, `SalesChart`, `LowStockCard`, `analyticsRoutes`) and downloadable CSV sales reports.
9. **Phase 10**: Production Docker containerization (`docker-compose.yml`) and enterprise deployment readiness.

---

## 💻 Tech Stack

- **Frontend**: React 19, Vite, HTML5 Canvas API, SVG Analytics Charts
- **Backend**: Node.js, Express.js, MongoDB / Mongoose, JWT Authentication
- **AI Service**: Python 3.10, FastAPI, PyTorch, Ultralytics YOLOv8, EasyOCR, Qwen2.5-VL, SentenceTransformers, FAISS

---

## 🐳 Quick Start with Docker Compose

Run the entire system in production mode with a single command:

```bash
docker-compose up --build
```

- **React Frontend**: `http://localhost:3000`
- **Express Backend**: `http://localhost:5001`
- **FastAPI AI Service**: `http://localhost:8000`
- **MongoDB**: `localhost:27017`

---

## 📄 License
Enterprise Open Source License - AI Smart Checkout System.
