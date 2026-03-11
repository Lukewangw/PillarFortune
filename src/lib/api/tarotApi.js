const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8787";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const tarotApi = {
  createReading(payload) {
    return request("/api/tarot/reading", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  followUp(payload) {
    return request("/api/tarot/follow-up", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  fetchHistory(userId) {
    return request(`/api/tarot/history?userId=${encodeURIComponent(userId)}`);
  },
  fetchReading(readingId) {
    return request(`/api/tarot/reading/${encodeURIComponent(readingId)}`);
  },
};

export { API_BASE };
