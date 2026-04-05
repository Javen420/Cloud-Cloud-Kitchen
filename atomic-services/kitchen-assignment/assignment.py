from supabase import Client
from maps_client import MapsClient, MapsClientError


def _parse_coord(value) -> float | None:
    """OutSystems often sends CLat/CLong as strings; treat blanks as missing."""
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip()
    if s in {"", "null", "None"}:
        return None
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def assign_kitchen_to_order(
    db: Client,
    order_id: str | int | None = None,
    delivery_address: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
) -> tuple[dict, int]:
    plat = _parse_coord(lat)
    plng = _parse_coord(lng)

    if plat is None or plng is None:
        return {
            "error": "Order is missing coordinates. Pass lat/lng (e.g. OutSystems CLat/CLong)."
        }, 422

    oid = str(order_id) if order_id is not None else ""

    kitchen_result = (
        db.table("kitchens")
        .select("*")
        .eq("is_active", True)
        .execute()
    )

    kitchens = kitchen_result.data
    if not kitchens:
        return {"error": "No active kitchens available."}, 503

    try:
        maps = MapsClient()
        destinations = [(k["lat"], k["lng"]) for k in kitchens]
        best_idx, distance_result = maps.nearest(
            origin=(plat, plng),
            destinations=destinations,
        )
    except MapsClientError as exc:
        return {"error": f"Maps service error: {str(exc)}"}, 502

    nearest_kitchen = kitchens[best_idx]

    return {
        "order_id": oid,
        "user_id": None,
        "total_amount": None,
        "items": None,
        "delivery_address": delivery_address or "",
        "customer_lat": plat,
        "customer_lng": plng,
        "kitchen_id": nearest_kitchen["id"],
        "kitchen_name": nearest_kitchen["name"],
        "kitchen_address": nearest_kitchen["address"],
        "kitchen_lat": nearest_kitchen["lat"],
        "kitchen_lng": nearest_kitchen["lng"],
        "distance_meters": distance_result["distance_meters"],
        "duration_seconds": distance_result["duration_seconds"],
    }, 200
