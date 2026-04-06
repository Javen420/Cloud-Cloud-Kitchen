# Cloud Cloud Kitchen

Microservices-based food order lifecycle: order intake, payment, kitchen assignment, rider dispatch, ETA tracking, and push notifications.

---

## Submission files

The following files are required to run the project but are excluded from the repository (`.gitignore`). They are included separately in the zip submission:

| File | Purpose |
|------|---------|
| `.env` | All environment variables (Supabase, Stripe, Firebase, Google APIs, RabbitMQ, OutSystems) |
| `firebase-service-account.json` | Firebase Admin SDK credentials for the notifications service |

Place `firebase-service-account.json` at the project root before running the Docker stack.

A `video.txt` file is included in the submission with the YouTube link to the demo video.

---

## External services

The project depends on the following hosted services. Credentials are pre-configured in the provided `.env` — **no sign-up is needed**.

| Service | Used for |
|---------|---------|
| **Supabase** | Database for kitchen, rider, and order data |
| **Stripe** (test mode) | Payment processing |
| **Firebase** | Push notifications (FCM) and rider authentication |
| **Google Routes API** | ETA calculation between rider and destination |
| **Google Maps API** | Address autocomplete and map display in Order UI |
| **OutSystems** | External menu catalogue and orders API (Scenario 1) |

> All credentials in `.env` point to live test/dev instances. Do not replace them.

---

## Test accounts

| Role | Credential | Value |
|------|-----------|-------|
| Customer (Stripe) | Test card number | `4242 4242 4242 4242` (any future date, any CVC) |
| Rider | Email / Password | `rider@test.com` / `password123` |

---

## Database

The database is hosted on Supabase (cloud). No local database setup or SQL import is required. The Supabase project is pre-populated with kitchen data sourced from the OutSystems Menu API and rider accounts for testing.

---

## Tech stack

- **Python** (FastAPI) — atomic and composite services
- **Go** — ETA Calculator service
- **React + Vite** — Order UI, Kitchen UI, Rider UI
- **RabbitMQ** — async messaging between services
- **Kong** — API gateway
- **Redis** — caching (ETA, driver sessions)
- **Supabase** — database and rider auth
- **Stripe** — payment processing
- **Firebase Cloud Messaging** — push notifications
- **Docker Compose** — container orchestration

---

## Repo layout

```
atomic-services/       Single-responsibility microservices
  etaCalculator/         Go service — Google Routes / haversine ETA
  kitchen-assignment/    Kitchen assignment logic (Supabase)
  new-orders/            OutSystems orders API proxy
  notifications/         RabbitMQ consumer → FCM push
  payment/               Stripe payment intents + webhooks
  verify-address/        Google Maps address validation

composite-services/    Orchestrators for multi-step flows
  assign-driver/         Rider dispatch + payout calculation
  etaTracking/           ETA polling + Redis caching
  kitchen-operations/    Poll pending orders → assign kitchens
  order-fulfilment/      Order submission + payment verification
  order-processor/       Kitchen status updates + notifications

UI/
  OrderUI/               Customer-facing: menu, cart, checkout, tracking
  KitchenUI/             Kitchen dashboard: order queue, status updates
  RiderUI/               Rider app: available orders, pickup, delivery

Infrastructure/
  docker-compose.yml     All services + UIs
  kong.yml               API gateway route config

shared/                Common AMQP publisher, config helpers
```

---

## How to run

### Prerequisites

- Docker + Docker Compose
- Node.js + npm (only if running UIs outside Docker)
- The `.env` and `firebase-service-account.json` files from the submission zip

### 1. Start the Docker stack

```bash
cd Infrastructure
docker compose up -d --build
```

This starts all backend services, the three UIs, Kong, RabbitMQ, and Redis.

### 2. Access the UIs

| UI | URL |
|----|-----|
| Order UI (customer) | http://localhost:5173 |
| Kitchen UI | http://localhost:5174 |
| Rider UI | http://localhost:5175 |

### 3. Infrastructure endpoints

| Service | URL |
|---------|-----|
| Kong API gateway | http://localhost:8000 |
| RabbitMQ management | http://localhost:15672 (`guest` / `guest`) |

### Run UIs locally (optional, outside Docker)

```bash
cd UI/OrderUI && npm install && npm run dev
cd UI/KitchenUI && npm install && npm run dev
cd UI/RiderUI && npm install && npm run dev
```

Set `VITE_API_BASE_URL` to `http://localhost:8000` if not using the Vite proxy.

---

## How services communicate

- Client UIs call Kong at `/api/v1/...`
- Kong routes requests to individual service containers by path
- Async events use RabbitMQ:
  - `order_events` topic exchange for notifications, ETA updates
  - `notifications` queue with retry + DLQ for failed FCM deliveries
- Service-to-service calls use HTTP within the Docker network (service hostnames, not `localhost`)

---

## Route map (Kong)

### Scenario 1 — Order

| Method | Path | Service |
|--------|------|---------|
| POST | `/api/v1/order/submit` | order-fulfilment:8081 |
| GET | `/api/v1/order/{id}` | order-fulfilment:8081 |
| POST/GET | `/api/v1/payment/*` | payment:8089 |
| GET | `/api/v1/menu` | OutSystems Menu API |

### Scenario 2 — Kitchen

| Method | Path | Service |
|--------|------|---------|
| GET/PUT | `/api/v1/kitchen/*` | order-processor:8094 |
| GET | `/api/v1/kitchen-assign/health` | kitchen-operations:8093 |

### Scenario 3 — Rider

| Method | Path | Service |
|--------|------|---------|
| GET/PUT | `/api/v1/driver/*` | assign-driver:8086 |
| GET/POST | `/api/v1/eta/*` | eta-tracking:8087 |

### Notifications

| Method | Path | Service |
|--------|------|---------|
| POST | `/api/notifications/subscribe` | notifications:8090 |
| POST | `/api/notifications/unsubscribe` | notifications:8090 |

---

## Order flow (Scenario 1)

1. Customer browses menu (fetched from OutSystems via Kong)
2. Customer adds items to cart, enters delivery address (Google Maps autocomplete)
3. Checkout creates a Stripe Payment Intent
4. On successful payment, `order-fulfilment` creates the order in OutSystems and verifies it
5. Confirmation returned to customer; push notification sent via RabbitMQ → FCM

## Kitchen flow (Scenario 2)

1. `kitchen-operations` polls OutSystems for pending orders
2. Assigns the nearest kitchen via `kitchen-assignment` (Supabase, haversine)
3. Updates OutSystems with kitchen assignment
4. Kitchen UI shows assigned orders; kitchen staff updates status (cooking → finished)
5. On `finished_cooking`, notification sent to customer

## Rider flow (Scenario 3)

1. Rider logs in via Supabase Auth (Firebase for push tokens)
2. `assign-driver` shows available `finished_cooking` orders sorted by distance
3. Rider accepts → dropoff cached in Redis, ETA calculated (Google Routes API with haversine fallback)
4. Rider picks up → marks `out_for_delivery`
5. Rider delivers → marks `delivered`
6. Push notifications sent at each stage

---

## Notifications flow

- Services publish events to `order_events` RabbitMQ exchange (or directly to `notifications` queue)
- `notifications` service consumes from the queue and sends FCM messages to topic `order_<order_id>`
- Customer's browser subscribes to the FCM topic on the tracking page
- Retry queue (`notifications.retry`) and dead-letter queue (`notifications.dlq`) handle failures

---

## Docker gotchas

- **Never use `localhost` for service-to-service URLs inside Docker** — use compose service names (`payment`, `rabbitmq`, `redis`, `kong`, etc.)
- **`docker compose restart` does NOT reload env vars** — after changing `.env` or `docker-compose.yml`:
  ```bash
  docker compose down
  docker compose up -d --build
  ```
- **Kong config** — Kong loads `kong.yml` on startup; restart Kong after changes
- **Firebase credentials** — set `FIREBASE_SERVICE_ACCOUNT_JSON` in `.env` (single-line JSON); alternatively use `FIREBASE_SERVICE_ACCOUNT_PATH` with a volume mount

---

## Stripe (local dev)

Use the Stripe CLI to forward webhook events to the payment service:

```bash
stripe listen --forward-to localhost:8089/api/v1/payment/webhook
```

Test card: `4242 4242 4242 4242`, any future expiry, any CVC.
