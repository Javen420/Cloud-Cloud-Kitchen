const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function normalizeMenuItem(raw) {
  // OutSystems commonly returns PascalCase keys like Id/Name/price.
  const id = raw?.Id ?? raw?.id ?? raw?.menu_item_id;
  const name = raw?.Name ?? raw?.name;
  const price = raw?.price ?? raw?.Price ?? raw?.UnitPrice;
  const description = raw?.description ?? raw?.Description ?? "";
  const category = raw?.category ?? raw?.Category ?? "Mains";

  return {
    id,
    name,
    price: typeof price === "string" ? Number(price) : price,
    description,
    category,
    raw,
  };
}

export async function getMenu() {
  const res = await fetch(`${BASE_URL}/api/v1/menu`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || "Failed to load menu");
  }

  const data = await res.json();
  const list = Array.isArray(data) ? data : data?.menu ?? data?.Menu ?? data?.items ?? [];
  return list.map(normalizeMenuItem).filter((i) => i.id != null && i.name);
}

