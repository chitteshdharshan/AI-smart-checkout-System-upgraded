const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * Health check to verify Python FastAPI service is reachable.
 */
const checkHealth = async () => {
  try {
    const res = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5000 });
    return res.data;
  } catch (err) {
    console.error(`[AI Service] Health check failed at ${AI_SERVICE_URL}/health:`, err.message);
    throw new Error(`AI Service is offline or unreachable at ${AI_SERVICE_URL} (${err.message})`);
  }
};

const uploadImageToEndpoint = async (absoluteFilePath, endpoint) => {
  if (!fs.existsSync(absoluteFilePath)) {
    throw new Error(`File not found for ${endpoint}: ${absoluteFilePath}`);
  }

  console.log(`[AI] Sending image to AI service endpoint: ${AI_SERVICE_URL}/${endpoint}`);

  const form = new FormData();
  form.append("image", fs.createReadStream(absoluteFilePath));

  try {
    const response = await axios.post(`${AI_SERVICE_URL}/${endpoint}`, form, {
      headers: {
        ...form.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 120000,
    });

    console.log(`[AI] Response status from ${endpoint}: ${response.status}`);
    return response.data;
  } catch (err) {
    const status = err.response ? err.response.status : "NO_RESPONSE";
    const detailData = err.response?.data;
    const msg = detailData?.detail || detailData?.message || err.message;
    const stage = detailData?.stage || endpoint;
    console.error(`[AI Error] Endpoint ${endpoint} failed (status: ${status}, stage: ${stage}): ${msg}`);
    const errorObj = new Error(`AI Endpoint /${endpoint} failed (status: ${status}): ${msg}`);
    errorObj.stage = stage;
    errorObj.detail = msg;
    throw errorObj;
  }
};

const detectProducts = async (absoluteFilePath) => {
  return await uploadImageToEndpoint(absoluteFilePath, "detect");
};

const performOCR = async (absoluteFilePath) => {
  console.log("[OCR] Starting OCR on:", absoluteFilePath);
  const response = await uploadImageToEndpoint(absoluteFilePath, "ocr");
  console.log("[OCR] OCR completed");
  return response.ocr || {};
};

const performVLM = async (absoluteFilePath) => {
  console.log("[VLM] Starting VLM analysis on:", absoluteFilePath);
  const response = await uploadImageToEndpoint(absoluteFilePath, "vlm");
  console.log("[VLM] VLM completed");
  return response.vlm || {};
};

const generateEmbedding = async (text) => {
  console.log(`[AI] Generating embedding for text (${text.length} chars)`);
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/embed`,
      { text },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 120000,
      }
    );
    return response.data.embedding || [];
  } catch (err) {
    console.error("[AI Error] Embedding generation failed:", err.message);
    throw new Error(`Embedding generation failed: ${err.message}`);
  }
};

const indexProducts = async (products) => {
  console.log(`[FAISS] Updating index for ${products.length} products`);
  try {
    await axios.post(
      `${AI_SERVICE_URL}/index_products`,
      { products },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 120000,
      }
    );
    console.log("[FAISS] Index update completed");
  } catch (err) {
    console.error("[FAISS Error] Vector indexing failed:", err.message);
    throw new Error(`FAISS indexing failed: ${err.message}`);
  }
};

const matchProduct = async (vlmData, ocrText = "", threshold = 0.8, embedding = null) => {
  try {
    const payload = { vlm: vlmData, ocr_text: ocrText, threshold };
    if (embedding) {
      payload.embedding = embedding;
    }
    const response = await axios.post(
      `${AI_SERVICE_URL}/match`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 120000,
      }
    );
    return response.data.match || null;
  } catch (err) {
    console.error("[FAISS Error] Matching failed:", err.message);
    return null;
  }
};

module.exports = {
  checkHealth,
  detectProducts,
  performOCR,
  performVLM,
  generateEmbedding,
  indexProducts,
  matchProduct,
};