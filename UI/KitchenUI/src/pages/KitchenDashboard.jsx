import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Radio,
  ChefHat,
  MapPin,
  Package,
  Bell,
  Filter,
  Loader2,
} from "lucide-react";
import { acceptOrder, fetchKitchenBoard, markOrderReady } from "@/services/kitchenApi.js";

const POLL_MS = 8000;

function formatItems(items) {
  if (!Array.isArray(items)) return "—";
  return items
    .map((it) => {
      const name = it.Name ?? it.name ?? "Item";
      const qty = it.quantity ?? it.qty ?? 1;
      return `${qty}× ${name}`;
    })
    .join(", ");
}

function customerLabel(order) {
  const u = order.user_id || order.customer_id || "";
  if (!u) return "Customer";
  return u.length > 12 ? `${u.slice(0, 10)}…` : u;
}

function statusBadge(status) {
  const s = (status || "").toLowerCase();
  if (s === "pending")
    return { label: "New", className: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
  if (s === "preparing")
    return { label: "Preparing", className: "bg-blue-500/20 text-blue-300 border-blue-500/40" };
  if (s === "ready")
    return { label: "Ready", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };
  return { label: status || "—", className: "bg-slate-600/40 text-slate-300 border-slate-500/40" };
}

function mapsDirUrl(from, to) {
  const o = new URL("https://www.google.com/maps/dir/");
  o.searchParams.set("api", "1");
  if (from) o.searchParams.append("origin", from);
  if (to) o.searchParams.append("destination", to);
  return o.toString();
}

export default function KitchenDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [lastSync, setLastSync] = useState(null);
  const [polling, setPolling] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [etaByOrder, setEtaByOrder] = useState({});
  const [logs, setLogs] = useState([]);

  const pushLog = useCallback((type, message) => {
    setLogs((prev) =>
      [
        {
          id: crypto.randomUUID(),
          type,
          message,
          at: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 80),
    );
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchKitchenBoard();
      setOrders(data.orders || []);
      setLastSync(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!polling) return undefined;
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [polling, load]);

  const newCount = useMemo(() => orders.filter((o) => o.status === "pending").length, [orders]);

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  async function onRefresh() {
    setSyncing(true);
    await load();
  }

  async function onAccept(order) {
    setActionId(order.id);
    try {
      const res = await acceptOrder(order.id);
      const mins = res.duration_seconds != null ? Math.max(1, Math.round(res.duration_seconds / 60)) : null;
      setEtaByOrder((prev) => ({
        ...prev,
        [order.id]: {
          minutes: mins,
          kitchenName: res.kitchen_name,
          kitchenAddress: res.kitchen_address,
          deliveryAddress: res.delivery_address,
          distanceMeters: res.distance_meters,
        },
      }));
      pushLog(
        "assign",
        `Order #${String(order.id).slice(-6)} assigned to ${res.kitchen_name}${mins != null ? ` — route ~${mins} min (kitchen→customer)` : ""}. Customer notification queued via notification service.`,
      );
      if (mins != null) {
        pushLog("eta", `ETA update: order #${String(order.id).slice(-6)} — ~${mins} min (maps routing).`);
      }
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionId(null);
    }
  }

  async function onMarkReady(order) {
    setActionId(order.id);
    try {
      await markOrderReady(order.id);
      pushLog(
        "ready",
        `Order #${String(order.id).slice(-6)} marked Ready for pickup — rider app will show this job.`,
      );
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionId(null);
    }
  }

  const logStyles = {
    assign: "border-l-kitchen-accent bg-blue-500/10",
    ready: "border-l-kitchen-success bg-emerald-500/10",
    eta: "border-l-kitchen-warn bg-orange-500/10",
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-kitchen-border bg-kitchen-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-kitchen-accent/20 flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-kitchen-accent" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Kitchen operations</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border ${
                polling
                  ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                  : "border-slate-600 text-slate-500"
              }`}
            >
              <Radio className={`h-3.5 w-3.5 ${polling ? "animate-pulse" : ""}`} />
              {polling ? "Kitchen online · polling" : "Polling paused"}
            </div>
            <button
              type="button"
              onClick={() => setPolling((p) => !p)}
              className="text-xs text-slate-400 hover:text-white underline-offset-2 hover:underline"
            >
              {polling ? "Pause" : "Resume"}
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-lg bg-kitchen-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync orders
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-kitchen-border bg-kitchen-card p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">New incoming</p>
              <p className="text-4xl font-extrabold text-white mt-1 tabular-nums">{newCount}</p>
              <p className="text-xs text-slate-500 mt-2">Orders awaiting kitchen acceptance</p>
            </div>
            <div className="rounded-2xl border border-kitchen-border bg-kitchen-card p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">On board</p>
              <p className="text-4xl font-extrabold text-white mt-1 tabular-nums">{orders.length}</p>
              <p className="text-xs text-slate-500 mt-2">
                Last sync: {lastSync ? lastSync.toLocaleTimeString() : "—"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            {["all", "pending", "preparing", "ready"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                  filter === key
                    ? "bg-kitchen-accent/20 border-kitchen-accent text-white"
                    : "border-kitchen-border text-slate-400 hover:text-white"
                }`}
              >
                {key === "all" ? "All" : statusBadge(key).label}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-kitchen-border p-12 text-center text-slate-500">
              No orders in this view.
            </div>
          ) : (
            <ul className="space-y-4">
              {filtered.map((order) => {
                const badge = statusBadge(order.status);
                const eta = etaByOrder[order.id];
                const busy = actionId === order.id;
                const kitchenLine =
                  order.assigned_kitchen || eta?.kitchenName || (order.status !== "pending" ? "—" : null);

                return (
                  <li
                    key={order.id}
                    className="rounded-2xl border border-kitchen-border bg-kitchen-card p-5 shadow-lg shadow-black/20"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm text-kitchen-accent">#{String(order.id).slice(-8)}</span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md border ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 mt-2">
                          <span className="text-slate-500">Customer:</span> {customerLabel(order)}
                        </p>
                        {kitchenLine && order.status !== "pending" && (
                          <p className="text-sm text-slate-300 mt-1">
                            <span className="text-slate-500">Kitchen:</span> {kitchenLine}
                          </p>
                        )}
                        <p className="text-sm text-slate-400 mt-2 flex gap-2 items-start">
                          <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-slate-500" />
                          {order.delivery_address || "—"}
                        </p>
                        <p className="text-sm text-slate-400 mt-2">
                          <span className="text-slate-500">Items:</span> {formatItems(order.items)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {order.status === "pending" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onAccept(order)}
                            className="rounded-lg bg-kitchen-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                          >
                            {busy ? "…" : "Accept"}
                          </button>
                        )}
                        {order.status === "preparing" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onMarkReady(order)}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                          >
                            {busy ? "…" : "Mark ready"}
                          </button>
                        )}
                        {order.status === "ready" && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            Rider queue
                          </span>
                        )}
                      </div>
                    </div>

                    {(eta || order.status !== "pending") && (
                      <div className="mt-4 pt-4 border-t border-kitchen-border grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-xl bg-black/20 border border-kitchen-border p-4">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            ETA panel
                          </p>
                          {eta?.minutes != null ? (
                            <p className="text-2xl font-bold text-white tabular-nums">~{eta.minutes} min</p>
                          ) : (
                            <p className="text-sm text-slate-500">
                              Accept order to compute Google route estimate (kitchen ↔ customer).
                            </p>
                          )}
                          {eta?.distanceMeters != null && (
                            <p className="text-xs text-slate-500 mt-1">
                              ~{(eta.distanceMeters / 1000).toFixed(1)} km (routing distance)
                            </p>
                          )}
                        </div>
                        <div className="rounded-xl bg-black/20 border border-kitchen-border p-4 overflow-hidden">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            Proximity / route
                          </p>
                          <p className="text-xs text-slate-500 mb-3">
                            Opens Google Maps directions (kitchen → customer). Embed requires Maps API key for
                            in-app tiles.
                          </p>
                          {eta?.kitchenAddress && order.delivery_address && (
                            <a
                              href={mapsDirUrl(eta.kitchenAddress, order.delivery_address)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-kitchen-accent hover:underline"
                            >
                              <MapPin className="h-4 w-4" />
                              Open map directions
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-kitchen-border bg-kitchen-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-kitchen-warn" />
              <h2 className="text-sm font-bold">Notification log</h2>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Mirrors outbound kitchen events (assignment, ETA, ready). Production traffic is published on RabbitMQ
              and consumed by the notification service for FCM.
            </p>
            <ul className="max-h-[480px] overflow-y-auto pr-1 space-y-2">
              {logs.length === 0 ? (
                <li className="text-xs text-slate-600">No events yet — accept or mark ready an order.</li>
              ) : (
                logs.map((log) => (
                  <li
                    key={log.id}
                    className={`text-xs border-l-4 rounded-r-lg px-3 py-2 ${logStyles[log.type] || "border-l-slate-600 bg-slate-800/50"}`}
                  >
                    <span className="text-slate-500 block text-[10px]">
                      {new Date(log.at).toLocaleTimeString()}
                    </span>
                    {log.message}
                  </li>
                ))
              )}
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
