import json
import os
import time
from urllib.parse import urlsplit, urlunsplit

import aiohttp
import aio_pika
from aio_pika import DeliveryMode, Message


NEW_ORDERS_URL = os.getenv(
    "NEW_ORDERS_URL",
    "https://personal-dkkhoptv.outsystemscloud.com/NewOrders/rest/OrdersAPI",
)
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
NOTIFICATION_QUEUE = os.getenv("NOTIFICATION_QUEUE", "notifications")

ALLOWED_STATUSES = {"cooking", "finished_cooking"}
ORDERS_CACHE_TTL_SECONDS = float(os.getenv("ORDERS_CACHE_TTL_SECONDS", "5"))
_orders_cache: dict[str, object] = {"expires_at": 0.0, "orders": []}


def _sanitize_base_url(url: str) -> str:
    parts = urlsplit(url.strip())
    return urlunsplit((parts.scheme, parts.netloc, parts.path.rstrip("/"), "", ""))


SANITIZED_NEW_ORDERS_URL = _sanitize_base_url(NEW_ORDERS_URL)


def _normalize_outsystems_order(raw: dict) -> dict:
    items_raw = raw.get("Items", "[]")
    try:
        items = json.loads(items_raw) if isinstance(items_raw, str) else items_raw
    except (json.JSONDecodeError, TypeError):
        items = []

    kitchen_id = raw.get("KitchenId")
    if str(kitchen_id).strip() in {"", "0", "None", "null"}:
        kitchen_id = None

    return {
        "id": str(raw.get("OrderId", "")),
        "user_id": raw.get("CustId", ""),
        "delivery_address": raw.get("DeliveryAddress", ""),
        "total_amount": int(raw.get("TotalPrice", 0) or 0),
        "items": items if isinstance(items, list) else [],
        "status": (raw.get("KitchenAssignStatus") or "pending").lower(),
        "kitchen_id": kitchen_id,
        "kitchen_name": raw.get("KitchenName") or "Cloud Kitchen",
        "kitchen_address": raw.get("KitchenAddress") or "",
        "kitchen_lat": raw.get("KitchenLat"),
        "kitchen_lng": raw.get("KitchenLong"),
    }


async def _get_all_orders(session: aiohttp.ClientSession) -> list[dict]:
    now = time.monotonic()
    cached_orders = _orders_cache.get("orders") or []
    expires_at = float(_orders_cache.get("expires_at") or 0.0)
    if now < expires_at and cached_orders:
        return list(cached_orders)

    async with session.get(f"{SANITIZED_NEW_ORDERS_URL}/GetAll") as resp:
        if resp.status != 200:
            print(f"[coordinate-fulfilment] Failed to poll orders: {resp.status}")
            if cached_orders:
                return list(cached_orders)
            return []
        body = await resp.json()
        raw_orders = body if isinstance(body, list) else []
        orders = [_normalize_outsystems_order(o) for o in raw_orders]
        _orders_cache["orders"] = orders
        _orders_cache["expires_at"] = now + ORDERS_CACHE_TTL_SECONDS
        return list(orders)


async def poll_cooking_orders():
    async with aiohttp.ClientSession() as session:
        orders = await _get_all_orders(session)
        cooking_orders = [o for o in orders if o["status"] == "cooking"]
        print(f"[coordinate-fulfilment] {len(cooking_orders)} order(s) currently cooking.")


async def get_orders_by_status(status: str, kitchen_id: str | None = None) -> tuple[dict, int]:
    async with aiohttp.ClientSession() as session:
        orders = await _get_all_orders(session)
        filtered = [o for o in orders if o["status"] == status]
        if kitchen_id:
            filtered = [o for o in filtered if str(o.get("kitchen_id") or "") == kitchen_id]
        return {"orders": filtered}, 200


async def get_orders_grouped_by_status(
    statuses: list[str],
    kitchen_id: str | None = None,
) -> tuple[dict, int]:
    async with aiohttp.ClientSession() as session:
        orders = await _get_all_orders(session)
        if kitchen_id:
            orders = [o for o in orders if str(o.get("kitchen_id") or "") == kitchen_id]

        grouped = {
            status: [o for o in orders if o["status"] == status]
            for status in statuses
        }
        return {"orders": grouped}, 200


async def _get_order_by_id(session: aiohttp.ClientSession, order_id: str) -> dict | None:
    async with session.get(
        f"{SANITIZED_NEW_ORDERS_URL}/GetOrder",
        params={"OrderId": order_id},
    ) as resp:
        if resp.status != 200:
            return None
        body = await resp.json()
        raw_order = body[0] if isinstance(body, list) and body else body
        if not raw_order:
            return None
        return _normalize_outsystems_order(raw_order)


async def update_order_status(order_id: str, status: str) -> tuple[dict, int]:
    if status not in ALLOWED_STATUSES:
        return {"error": f"Invalid status '{status}'. Allowed: {ALLOWED_STATUSES}"}, 422

    async with aiohttp.ClientSession() as session:
        current_order = await _get_order_by_id(session, order_id)
        if not current_order:
            return {"error": "Order not found"}, 404

        update_payload = {
            "KitchenId": str(current_order.get("kitchen_id") or ""),
            "KitchenLong": str(current_order.get("kitchen_lng") or ""),
            "KitchenLat": str(current_order.get("kitchen_lat") or ""),
            "KitchenAddress": current_order.get("kitchen_address") or "",
            "KitchenAssignStatus": status,
        }

        async with session.patch(
            f"{SANITIZED_NEW_ORDERS_URL}/UpdateKitchenStatus",
            params={"OrderId": order_id},
            json=update_payload,
        ) as resp:
            if resp.status != 200:
                try:
                    body = await resp.json()
                except Exception:
                    body = {"error": await resp.text()}
                return {"error": body.get("error") or body.get("Message") or "Status update failed"}, resp.status

        _orders_cache["expires_at"] = 0.0

        if status == "finished_cooking":
            try:
                connection = await aio_pika.connect_robust(RABBITMQ_URL)
                async with connection:
                    channel = await connection.channel()
                    await channel.declare_queue(NOTIFICATION_QUEUE, durable=True)
                    await channel.default_exchange.publish(
                        Message(
                            body=json.dumps(
                                {
                                    "order_id": order_id,
                                    "status": "finished_cooking",
                                    "kitchen_id": current_order.get("kitchen_id"),
                                    "delivery_address": current_order.get("delivery_address"),
                                    "total_amount": current_order.get("total_amount"),
                                }
                            ).encode(),
                            content_type="application/json",
                            delivery_mode=DeliveryMode.PERSISTENT,
                        ),
                        routing_key=NOTIFICATION_QUEUE,
                    )
                print(f"[coordinate-fulfilment] Notified customer for order {order_id}")
            except Exception as exc:
                print(f"[coordinate-fulfilment] Notification failed for {order_id}: {exc}")

    return {"order_id": order_id, "status": status}, 200
