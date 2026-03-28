import os
import requests
from dataclasses import dataclass
from typing import List, Tuple

# Kitchen assignment: prefer Maps key (Geocoding + Distance Matrix); fall back to Routes key if unset.
GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
GOOGLE_ROUTES_API_KEY = os.environ.get("GOOGLE_ROUTES_API_KEY", "").strip()

GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"
DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"

_KEY_RESTRICTION_HINT = (
    "If your key uses \"HTTP referrers\" restrictions, it only works in browsers — "
    "not from this server. Use a server key with no referrer restriction, "
    "or \"IP addresses\" restriction for your deployment egress IP."
)


def _kitchen_google_key() -> str:
    """
    GOOGLE_MAPS_API_KEY → kitchen (Geocoding + Distance Matrix).
    GOOGLE_ROUTES_API_KEY → fallback only if Maps key is not set (e.g. shared dev key).

    Enable **Geocoding API** and **Distance Matrix API** on the Maps key’s GCP project.
    """
    key = GOOGLE_MAPS_API_KEY or GOOGLE_ROUTES_API_KEY
    if not key:
        raise MapsClientError(
            "Set GOOGLE_MAPS_API_KEY (preferred) or GOOGLE_ROUTES_API_KEY. "
            "Kitchen assignment uses Geocoding API + Distance Matrix API."
        )
    return key


def _geocode_error(body: dict) -> MapsClientError:
    status = body.get("status", "")
    msg = body.get("error_message", "") or ""
    extra = ""
    if status == "REQUEST_DENIED" or "denied" in msg.lower():
        extra = f" {_KEY_RESTRICTION_HINT}"
    return MapsClientError(
        f"Geocoding API error: {status} — {msg}.{extra} "
        'Enable "Geocoding API" on this key in Google Cloud Console.'
    )


@dataclass
class DistanceResult:
    destination_index: int
    distance_meters: float
    duration_seconds: float
    status: str  # "OK", "NOT_FOUND", etc.


class MapsClientError(Exception):
    """Raised when Google APIs return an unexpected error."""


class MapsClient:
    """
    Thin wrapper: Geocoding API + Distance Matrix API (original kitchen-assignment design).
    Picks nearest kitchen by driving distance from geocoded delivery address.
    """

    def __init__(self, api_key: str | None = None):
        self._api_key = (api_key or _kitchen_google_key()).strip()

    def geocode(self, address: str) -> Tuple[float, float]:
        params = {"address": address, "key": self._api_key}

        try:
            resp = requests.get(GEOCODING_URL, params=params, timeout=10)
            resp.raise_for_status()
        except requests.RequestException as exc:
            raise MapsClientError(f"Geocoding HTTP request failed: {exc}") from exc

        body = resp.json()
        status = body.get("status", "")

        if status == "ZERO_RESULTS":
            raise MapsClientError(f"Geocoding returned no results for address: '{address}'")
        if status != "OK":
            raise _geocode_error(body)

        location = body["results"][0]["geometry"]["location"]
        return location["lat"], location["lng"]

    def distance_matrix(
        self,
        origin: Tuple[float, float],
        destinations: List[Tuple[float, float]],
        mode: str = "driving",
    ) -> List[DistanceResult]:
        origin_str = f"{origin[0]},{origin[1]}"
        dest_str = "|".join(f"{lat},{lng}" for lat, lng in destinations)

        params = {
            "origins": origin_str,
            "destinations": dest_str,
            "mode": mode,
            "key": self._api_key,
        }

        try:
            resp = requests.get(DISTANCE_MATRIX_URL, params=params, timeout=15)
            resp.raise_for_status()
        except requests.RequestException as exc:
            raise MapsClientError(f"Distance Matrix HTTP request failed: {exc}") from exc

        body = resp.json()
        top_status = body.get("status", "")
        err_msg = body.get("error_message", "") or ""

        if top_status not in ("OK",):
            extra = ""
            if top_status == "REQUEST_DENIED" or "denied" in err_msg.lower():
                extra = f" {_KEY_RESTRICTION_HINT}"
            raise MapsClientError(
                f"Distance Matrix API error: {top_status} — {err_msg}.{extra} "
                'Enable "Distance Matrix API" (and billing) on this key in Google Cloud Console.'
            )

        rows = body.get("rows", [])
        if not rows:
            raise MapsClientError("Distance Matrix returned no rows.")

        elements = rows[0].get("elements", [])
        results: List[DistanceResult] = []

        for idx, element in enumerate(elements):
            el_status = element.get("status", "UNKNOWN")
            if el_status == "OK":
                results.append(
                    DistanceResult(
                        destination_index=idx,
                        distance_meters=float(element["distance"]["value"]),
                        duration_seconds=float(element["duration"]["value"]),
                        status="OK",
                    )
                )
            else:
                results.append(
                    DistanceResult(
                        destination_index=idx,
                        distance_meters=float("inf"),
                        duration_seconds=float("inf"),
                        status=el_status,
                    )
                )

        return results

    def nearest(
        self,
        origin: Tuple[float, float],
        destinations: List[Tuple[float, float]],
        mode: str = "driving",
    ) -> Tuple[int, DistanceResult]:
        results = self.distance_matrix(origin, destinations, mode)
        reachable = [r for r in results if r.status == "OK"]
        if not reachable:
            raise MapsClientError("No reachable kitchens (Distance Matrix).")
        best = min(reachable, key=lambda r: r.distance_meters)
        return best.destination_index, best

    def nearest_from_address(
        self,
        address: str,
        destinations: List[Tuple[float, float]],
        mode: str = "driving",
    ) -> Tuple[int, DistanceResult]:
        origin = self.geocode(address)
        return self.nearest(origin, destinations, mode)
