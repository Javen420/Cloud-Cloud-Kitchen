from pydantic import BaseModel

class DropoffRequest(BaseModel):
    order_id: str
    driver_id: str
    customer_id: str
    dropoff_lat: float
    dropoff_lng: float