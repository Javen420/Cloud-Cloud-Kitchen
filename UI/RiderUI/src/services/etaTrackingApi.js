const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Fetches ETA preview from the Assign Driver CS.
 * The CS handles caching the dropoff and calling ETA Tracking → ETA Calculator.
 *
 * Returns: { estimated_minutes, distance_meters, source, order_id, driver_id }
 */
export async function getEtaPreview(orderId, driverLat, driverLng, driverId) {
  const resp = await fetch(`${BASE_URL}/api/v1/driver/eta`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      order_id: String(orderId),
      driver_id: driverId,
      driver_lat: driverLat,
      driver_lng: driverLng,
    }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(
      body.error || body.detail?.message || body.message || `ETA fetch failed (${resp.status})`,
    );
  }

  return resp.json();
}

/**
 * Fetches live ETA from the ETA Tracking CS (post-assignment).
 * The service validates driver ownership via X-Driver-ID header.
 *
 * Returns: { estimated_minutes, distance_meters, source, order_id, driver_id }
 */
export async function getEtaTracking(orderId, driverLat, driverLng, driverId) {
  const params = new URLSearchParams({
    driver_lat: driverLat,
    driver_lng: driverLng,
  });

  const resp = await fetch(`${BASE_URL}/api/v1/eta/${orderId}?${params}`, {
    headers: {
      "X-Driver-ID": driverId,
    },
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(
      body.detail?.message || body.message || `ETA fetch failed (${resp.status})`,
    );
  }

  return resp.json();
}
