const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export async function createPaymentIntent(payload) {
  const res = await fetch(`${BASE_URL}/api/v1/payment/intents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.detail || "Failed to create payment intent");
  }
  return res.json();
}
