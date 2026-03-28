const BASE = import.meta.env.VITE_API_BASE_URL || "";

export async function fetchKitchenBoard() {
  const res = await fetch(`${BASE}/api/v1/kitchen/orders`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Failed to load orders (${res.status})`);
  }
  return res.json();
}

export async function acceptOrder(orderId) {
  const res = await fetch(`${BASE}/api/v1/kitchen/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.error || (typeof err.detail === "string" ? err.detail : err.detail?.message) || `Accept failed (${res.status})`,
    );
  }
  return res.json();
}

export async function markOrderReady(orderId) {
  const res = await fetch(`${BASE}/api/v1/kitchen/orders/${orderId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ready" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Mark ready failed (${res.status})`);
  }
  return res.json();
}
