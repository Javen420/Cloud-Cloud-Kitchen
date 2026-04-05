from pydantic import BaseModel, field_validator


class AssignKitchenRequest(BaseModel):
    order_id: str | int | None = None
    delivery_address: str | None = None
    lat: float | str | int | None = None
    lng: float | str | int | None = None

    @field_validator("order_id", mode="before")
    @classmethod
    def _order_id_to_str(cls, v):
        if v is None:
            return None
        return str(v)


class AddKitchenRequest(BaseModel):
    name: str
    address: str
    lat: float
    lng: float
    is_active: bool = True


class KitchenResponse(BaseModel):
    kitchen_id: str
    name: str
    address: str
    lat: float
    lng: float
    is_active: bool


class AssignmentResponse(BaseModel):
    order_id: str
    kitchen_id: str
    kitchen_name: str
    kitchen_address: str
    customer_lat: float
    customer_lng: float
    distance_meters: float
    duration_seconds: float
