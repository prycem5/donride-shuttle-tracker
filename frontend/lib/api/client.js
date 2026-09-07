// lib/api/client.js
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5050";

async function request(
  path,
  { method = "GET", headers = {}, body, signal } = {}
) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal,
  });
  console.log(`API ${method} ${path} -> ${res.status}`);

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON or empty – leave data as null
  }

  if (!res.ok) {
    const message = data?.message || data?.error || `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  get: (path, opts) => request(path, { method: "GET", ...(opts || {}) }),
  post: (path, body, opts) =>
    request(path, { method: "POST", body, ...(opts || {}) }),
  put: (path, body, opts) =>
    request(path, { method: "PUT", body, ...(opts || {}) }),
  del: (path, opts) => request(path, { method: "DELETE", ...(opts || {}) }),
};
