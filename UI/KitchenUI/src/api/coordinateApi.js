/**
 * Kitchen UI talks to Kong at `/api/v1/kitchen/*` (same gateway pattern as OrderUI/RiderUI).
 * Kong forwards those routes to `order-processor`.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const KITCHEN_API = `${BASE_URL}/api/v1/kitchen`;

export async function fetchOrdersByStatus(status, kitchenId = null) {
  const params = new URLSearchParams({ status });
  if (kitchenId) params.set("kitchen_id", kitchenId);

  const res = await fetch(`${KITCHEN_API}/orders?${params.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || res.statusText || "Failed to load orders");
  }
  return data.orders || [];
}

export async function updateOrderStatus(orderId, status) {
  const res = await fetch(`${KITCHEN_API}/orders/${encodeURIComponent(orderId)}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || res.statusText || "Update failed");
  }
  return data;
}

/** True when order-processor is reachable. */
export async function fetchCoordinateHealth() {
  try {
    const res = await fetch(`${KITCHEN_API}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

/** Load several statuses in parallel (for dashboard stats + "All" tab). */
export async function fetchOrdersByStatuses(statuses, kitchenId = null) {
  const lists = await Promise.all(statuses.map((s) => fetchOrdersByStatus(s, kitchenId)));
  return Object.fromEntries(statuses.map((s, i) => [s, lists[i]]));
}
