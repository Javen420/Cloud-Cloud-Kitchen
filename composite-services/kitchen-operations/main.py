import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from orchestrator import poll_and_assign

POLL_INTERVAL = int(os.getenv("POLL_INTERVAL_SECONDS", "10"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(polling_loop())
    yield
    task.cancel()


async def polling_loop():
    while True:
        try:
            await poll_and_assign()
        except Exception as exc:
            print(f"[kitchen-operations] polling error: {exc}")
        await asyncio.sleep(POLL_INTERVAL)


app = FastAPI(title="Assign Kitchen Composite Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/api/v1/kitchen-assign/health")
def health_via_gateway():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8093)