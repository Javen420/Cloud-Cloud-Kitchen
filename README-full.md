# Cloud Cloud Kitchen - Full README

## 1. Project overview

- Name: Cloud Cloud Kitchen
- Purpose: microservices-based food order lifecycle (order intake, payment, kitchen assignment, rider dispatch, ETA tracking, notifications)
- Stack:
  - Python services (Flask/FastAPI style) in `atomic-services` + `composite-services`
  - Vite frontends for Order/Kitchen/Rider
  - RabbitMQ event bus + Kong API gateway + Redis + Supabase (data) + Stripe payments + Firebase FCM

## 2. Repo layout

- `atomic-services/`
  small single-responsibility service containers.
- `composite-services/`
  orchestrators for multi-step flows (assign-kitchen, assign-driver, coordinate-fulfilment, etc).
- `UI/`
  - `OrderUI`, `KitchenUI`, `RiderUI` (Vite + React)
- `Infrastructure/`
  - `docker-compose.yml`, `kong.yml`
- `shared/`
  - common RabbitMQ, Redis, DB helpers
- top-level `firebase-service-account.json` and `.env` (credentials)

## 3. How components communicate

- Client UIs → Kong `/api/v1/...`
- Kong routes to individual service containers by path.
- Async events use RabbitMQ queues:
  - `new-orders`, `order-updates`, `notifications`, plus retries/DLQ.
- API patterns:
  - Order flow: `order-fulfilment` + optionally `coordinate-fulfilment` → external OutSystems APIs
  - Kitchen assignments: `assign-kitchen`
  - Rider assignments/ETA: `assign-driver`, `eta-tracking`
  - Payments: `payment` service with Stripe / webhook

## 4. Prerequisites

- Docker + docker-compose
- Node.js + npm (for UIs)
- Environment variables in root `.env`:
  - `SUPABASE_URL`, `SUPABASE_KEY`
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - `OUTSYSTEMS_MENU_URL`, `OUTSYSTEMS_NEWORDERS_URL`
  - `RABBITMQ_URL` (e.g. `amqp://guest:guest@rabbitmq:5672/`)
  - `PAYMENT_URL=http://payment:8089` (if local)
  - FCM credential via:
    - `FIREBASE_SERVICE_ACCOUNT_JSON` or
    - `FIREBASE_SERVICE_ACCOUNT_PATH`

## 5. Run with Docker Compose

From repo root:

```bash
cd Infrastructure
docker compose up -d --build
```

Check service endpoints:

- Kong API gateway: `http://localhost:8000`
- RabbitMQ management: `http://localhost:15672` (`guest` / `guest`)

UI containers (via compose):

- Order: `http://localhost:5173`
- Kitchen: `http://localhost:5174`
- Rider: `http://localhost:5175`

If compose adds/reloads:

```bash
docker compose down
docker compose up -d --build
```

## 6. Run UIs locally (optional non-container dev)

```bash
cd UI/OrderUI && npm install && npm run dev
cd UI/KitchenUI && npm install && npm run dev
cd UI/RiderUI && npm install && npm run dev
```

Set `VITE_API_BASE_URL` to `http://localhost:8000` if not using Vite proxy.

## 7. Key route map (Kong)

- `POST /api/v1/order/submit` → `order-fulfilment:8081`
- `GET /api/v1/order/{id}` → `order-fulfilment:8081`
- `POST|GET /api/v1/payment/*` → `payment:8089`
- `GET /api/v1/menu` → OutSystems menu service
- `GET|PUT /api/v1/kitchen/*` → `coordinate-fulfilment:8094`
- `GET /api/v1/kitchen-assign/health` → `assign-kitchen:8093`
- `GET|PUT /api/v1/driver/assign` → `assign-driver:8086`
- `GET /api/v1/driver/orders` → `assign-driver:8086`
- `GET|POST /api/v1/eta/*` → `eta-tracking:8087`

## 8. Important Docker network notes

- inside compose, use service hostnames (not `localhost`): e.g., `new-orders`, `payment`, `rabbitmq`, `kong`.
- restart doesn’t refresh environment; run `docker compose down` + `up -d --build` after `.env` changes.
- `kitchen` service needs correct port mapping from each Dockerfile + compose.

## 9. Payment + reliability behavior

- `order-fulfilment` expects OutSystems create-order to return non-zero `OrderId`.
- then verifies via `GET /api/v1/order?OrderId=...`
- on verification fail → returns 5xx to avoid stale create acknowledgement.
- Stripe webhooks through `payment` service; use Stripe CLI in local debugging.

## 10. Notifications flow

- RabbitMQ queue `notifications`
- `notifications` consumer → FCM message for topic `order_<order_id>`
- queues:
  - `notifications.retry`
  - `notifications.dlq`
- ensures retries + DLQ for failed FCM deliveries
