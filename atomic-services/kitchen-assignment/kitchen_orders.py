from supabase import Client


KITCHEN_STATUSES = ("pending", "preparing", "ready")


def list_kitchen_board(db: Client) -> tuple[dict, int]:
    result = (
        db.table("orders")
        .select("*")
        .in_("status", list(KITCHEN_STATUSES))
        .order("updated_at", desc=True)
        .limit(50)
        .execute()
    )
    return {"orders": result.data or []}, 200


def set_kitchen_order_ready(db: Client, order_id: str) -> tuple[dict, int]:
    cur = db.table("orders").select("id, status").eq("id", order_id).execute()
    if not cur.data:
        return {"error": "Order not found."}, 404
    if cur.data[0].get("status") != "preparing":
        return {
            "error": "Order must be in Preparing state before marking ready.",
        }, 400
    db.table("orders").update({"status": "ready"}).eq("id", order_id).execute()
    return {"order_id": order_id, "status": "ready"}, 200
