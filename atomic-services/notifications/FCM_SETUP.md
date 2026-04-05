## FCM Topics Setup (Web + Mobile)

This project uses **Firebase Cloud Messaging (FCM)** to push order status updates in real time.

### 1) Backend: Notification service

Service: `atomic-services/notifications`

- Consumes RabbitMQ queue `notifications`
- Publishes each message to FCM topic: `order_<order_id>`
- Provides topic subscription endpoints:
  - `POST /api/notifications/subscribe` body: `{ "token": "...", "order_id": "..." }`
  - `POST /api/notifications/unsubscribe` body: `{ "token": "...", "order_id": "..." }`

Required env vars:

- `RABBITMQ_URL`
- One of:
  - `FIREBASE_SERVICE_ACCOUNT_JSON` (JSON string)
  - `FIREBASE_SERVICE_ACCOUNT_PATH` (file path inside container)

Optional env vars:
- `NOTIFICATION_QUEUE` (default `notifications`)
- `FCM_TOPIC_PREFIX` (default `order_`)

### 2) Web frontend setup (Vite + React)

Install:

```bash
cd UI/OrderUI
npm install
```

Required Vite env vars (for web push):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_VAPID_KEY`

Runtime behavior:
- The customer tracking page requests notification permission.
- It retrieves an FCM token and calls `/api/notifications/subscribe` for `order_<order_id>`.
- Foreground messages update the UI immediately; polling remains as fallback.

Background notifications:
- Provided via `UI/OrderUI/public/firebase-messaging-sw.js` (config passed in the query string when the SW is registered).

### 3) Mobile setup (Android/iOS)

Mobile apps can subscribe to topics **directly** using the FCM SDK (no backend call required):

- Subscribe to: `order_<orderId>` when the user opens the tracking screen
- Unsubscribe on logout / when tracking is no longer needed

### 4) End-to-end test

1. Start infrastructure (`redis`, `rabbitmq`, `kong`) and services (`order-fulfilment`, `notifications`, etc.).
2. Open the customer UI and place an order (or open an existing track URL).
3. In DevTools → Network, confirm `POST /api/notifications/subscribe` returns **200** after you click **Enable** on the tracking page.
4. Trigger a push: either a real order event (RabbitMQ → notifications consumer) or:
   `POST http://localhost:8000/api/notifications/test?order_id=<id>&message=test`
5. Confirm a system notification and/or the tracking UI updates (foreground handler).

### 5) Localhost setup (step-by-step)

**A. Firebase Console (one-time)**

1. Open [Firebase Console](https://console.firebase.google.com) → select or create a project.
2. **Web app:** Project settings (gear) → *General* → *Your apps* → add **Web** (`</>`) if you do not have one. Copy `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId` into repo root `.env` as `VITE_FIREBASE_*` (see `.env.example` names).
3. **VAPID key:** Project settings → *Cloud Messaging* → *Web Push certificates* → **Generate key pair**. Copy the key into `.env` as `VITE_FIREBASE_VAPID_KEY`.
4. **Service account (backend):** Project settings → *Service accounts* → **Generate new private key** → save JSON as **`firebase-service-account.json` at the repository root** (same folder as `Infrastructure/`). Docker Compose mounts this file into the `notifications` container.

**B. Repo `.env`**

- Fill all `VITE_FIREBASE_*` variables (match `.env.example`).
- Optional: `VITE_API_BASE_URL=http://localhost:8000` — if unset, OrderUI proxies `/api` to Kong via `vite.config.js`.

**C. Docker**

```bash
cd Infrastructure
docker compose up -d --build kong rabbitmq redis notifications order-fulfilment order
```

Ensure `notifications` is running and `firebase-service-account.json` exists at repo root.

**D. Order UI**

```bash
cd UI/OrderUI
npm install
npm run dev
```

Open `http://localhost:5173`, go to **Track order** for an id, click **Enable** (notifications permission), confirm subscribe **200**.

**E. Smoke test**

```bash
curl -X POST "http://localhost:8000/api/notifications/test?order_id=YOUR_ORDER_ID&message=Hello"
```

**Notes**

- **HTTP `localhost` is OK** for web push in Chrome (secure context).
- Use a normal window first; some privacy modes block notifications.
- If subscribe is **503**, fix Firebase Admin credentials in the `notifications` container (`docker compose logs notifications`).
