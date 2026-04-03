from pydantic import BaseModel
from typing import List


class OrderInput(BaseModel):
    order_id: str
    delivery_address: str


class AssignOrdersRequest(BaseModel):
    orders: List[OrderInput]


class AssignedOrder(BaseModel):
    order_id: str
    kitchen_id: str
    kitchen_name: str
    kitchen_address: str
    distance_meters: float
    duration_seconds: float
    status: str = "confirmed"


class FailedOrder(BaseModel):
    order_id: str
    reason: str


class AssignOrdersResponse(BaseModel):
    assigned: List[AssignedOrder]
    failed: List[FailedOrder]