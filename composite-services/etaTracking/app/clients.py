import httpx

class ETAClient:
    def __init__(self, eta_calculation_url: str):
        self.url = eta_calculation_url
        self.http = httpx.AsyncClient(timeout=10.0)

    async def calculate(self, driver_lat: float, driver_lng: float,
                        dropoff_lat: float, dropoff_lng: float,
                        order_id: str, driver_id: str) -> dict | None:
        try:
            resp = await self.http.get(
                f"{self.url}/api/v1/eta/calculate",
                params={
                    "driver_lat": driver_lat,
                    "driver_lng": driver_lng,
                    "dropoff_lat": dropoff_lat,
                    "dropoff_lng": dropoff_lng,
                    "order_id": order_id,
                    "driver_id": driver_id,
                },
            )
            if resp.status_code != 200:
                return None
            return resp.json()
        except httpx.RequestError:
            return None

    async def close(self):
        await self.http.aclose()