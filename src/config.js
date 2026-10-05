// Single place for the backend URL.
// VITE_API_URL may be "https://host", "https://host/" or "https://host/api" - all work.
const raw = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const API_URL = raw.replace(/\/+$/, "").replace(/\/api$/, "");
export const API_BASE = `${API_URL}/api`;
