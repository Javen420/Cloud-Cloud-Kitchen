import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from supabase import Client

ROOT_DIR = Path(__file__).resolve().parent
load_dotenv()

if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from shared.database import get_supabase
from schemas import AssignKitchenRequest, AddKitchenRequest, KitchenOrderStatusUpdate
from assignment import assign_kitchen_to_order
from kitchen import add_kitchen, get_all_kitchens, get_kitchen_by_id
from kitchen_orders import list_kitchen_board, set_kitchen_order_ready

app = FastAPI(title="Kitchen Assignment Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db() -> Client:
    return get_supabase()


# ── Kitchen Assignment ────────────────────────────────────────────────────────

@app.get("/api/v1/kitchen/orders")
def kitchen_board(db: Client = Depends(get_db)):
    """Orders visible on the kitchen board: pending → preparing → ready."""
    response, status_code = list_kitchen_board(db=db)
    return JSONResponse(content=response, status_code=status_code)


@app.post("/api/v1/kitchen/assign")
def assign_kitchen_api(
    payload: AssignKitchenRequest,
    db: Client = Depends(get_db),
):
    """Accept order: nearest kitchen via Google Maps + status → preparing."""
    response, status_code = assign_kitchen_to_order(db=db, order_id=payload.order_id)
    return JSONResponse(content=response, status_code=status_code)


@app.put("/api/v1/kitchen/orders/{order_id}/status")
def kitchen_update_status(
    order_id: str,
    payload: KitchenOrderStatusUpdate,
    db: Client = Depends(get_db),
):
    if payload.status != "ready":
        return JSONResponse(
            content={"error": "Only status 'ready' is supported from this endpoint."},
            status_code=400,
        )
    response, status_code = set_kitchen_order_ready(db=db, order_id=order_id)
    return JSONResponse(content=response, status_code=status_code)


@app.post("/assign")
def assign_kitchen(
    payload: AssignKitchenRequest,
    db: Client = Depends(get_db),
):
    """
    Given an order_id, fetch the order's delivery_lat/lng from the orders table,
    find the nearest available kitchen via Google Maps, and return the assignment.
    """
    response, status_code = assign_kitchen_to_order(
        db=db,
        order_id=payload.order_id,
    )
    return JSONResponse(content=response, status_code=status_code)


# ── Kitchen CRUD ──────────────────────────────────────────────────────────────

@app.post("/kitchens")
def create_kitchen(
    payload: AddKitchenRequest,
    db: Client = Depends(get_db),
):
    response, status_code = add_kitchen(db=db, payload=payload)
    return JSONResponse(content=response, status_code=status_code)


@app.get("/kitchens")
def list_kitchens(db: Client = Depends(get_db)):
    response, status_code = get_all_kitchens(db=db)
    return JSONResponse(content=response, status_code=status_code)


@app.get("/kitchens/{kitchen_id}")
def get_kitchen(kitchen_id: str, db: Client = Depends(get_db)):
    response, status_code = get_kitchen_by_id(db=db, kitchen_id=kitchen_id)
    return JSONResponse(content=response, status_code=status_code)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8091)