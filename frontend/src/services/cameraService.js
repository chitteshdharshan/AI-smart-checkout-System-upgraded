import API from "./api";

/**
 * Uploads captured camera frame to backend (Step 3.6)
 */
export const uploadCapturedImage = async (imageFileOrBlob, onProgress) => {
  const formData = new FormData();
  formData.append("image", imageFileOrBlob, "capture.jpg");

  const response = await API.post("/camera/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });

  return response.data;
};

/**
 * Fetches capture history (Step 3.9)
 */
export const getCaptureHistory = async () => {
  const response = await API.get("/camera/history");
  return response.data;
};
