from fastapi import Request
from app.cache import TrackingCache
from app.clients import ETAClient
from shared.AMQP_Publisher import AMQPPublisher


async def get_cache(request: Request) -> TrackingCache:
    return TrackingCache(request.app.state.redis)


async def get_client(request: Request) -> ETAClient:
    return request.app.state.eta_client


async def get_publisher(request: Request) -> AMQPPublisher:
    return request.app.state.publisher
