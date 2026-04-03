import { useNavigate } from "react-router-dom";

export default function OrderListCard({ order }) {
  const navigate = useNavigate();

  const totalTripKm =
    order.pickupDistanceKm != null && order.deliveryDistanceKm != null
      ? (order.pickupDistanceKm + order.deliveryDistanceKm).toFixed(2)
      : null;

  const pickupEtaMinutes =
    order.pickupDistanceKm != null
      ? Math.max(2, Math.round((order.pickupDistanceKm / 0.45) * 2))
      : null;

  const dropoffEtaMinutes =
    order.deliveryDistanceKm != null
      ? Math.max(3, Math.round((order.deliveryDistanceKm / 0.5) * 2))
      : null;

  const itemSummary =
    order.itemsList && order.itemsList.length > 0
      ? order.itemsList
          .slice(0, 3)
          .map((item) => `${item.Name} x${item.quantity}`)
          .join(", ")
      : `${order.items} item${order.items === 1 ? "" : "s"}`;

  const orderSizeLabel = `${order.items} item${order.items === 1 ? "" : "s"}`;
  const totalEtaMinutes =
    pickupEtaMinutes != null && dropoffEtaMinutes != null
      ? pickupEtaMinutes + dropoffEtaMinutes
      : null;
  const pickupDistanceLabel =
    order.pickupDistanceKm != null ? `${order.pickupDistanceKm} km away` : "Distance pending";
  const deliveryDistanceLabel =
    order.deliveryDistanceKm != null ? `${order.deliveryDistanceKm} km to customer` : "Distance pending";

  return (
    <article className="card order-list-card">
      <div className="card-top-row">
        <div className="card-heading-block">
          <h3>{order.id}</h3>
          <p className="muted">{order.pickupStore}</p>
          <p className="order-item-summary">
            {order.customerName ? `Deliver to ${order.customerName}` : itemSummary}
          </p>
        </div>
        <div className="card-pill-stack">
          <span className="label payout-label">Payout</span>
          <div className="price-pill">${order.payout.toFixed(2)}</div>
        </div>
      </div>

      <div className="order-stat-row">
        <div className="meta-chip compact">
          <span className="label">Items</span>
          <p>{orderSizeLabel}</p>
        </div>
        <div className="meta-chip compact">
          <span className="label">Trip</span>
          <p>{totalTripKm != null ? `${totalTripKm} km` : "Pending"}</p>
        </div>
        <div className="meta-chip compact">
          <span className="label">ETA</span>
          <p>{totalEtaMinutes != null ? `${totalEtaMinutes} min` : "Pending"}</p>
        </div>
      </div>

      <div className="route-summary">
        <div className="route-stop">
          <span className="route-marker pickup" aria-hidden="true" />
          <div>
            <span className="label">Pick up</span>
            <p>{order.pickupAddress}</p>
            <span className="route-distance">{pickupDistanceLabel}</span>
          </div>
        </div>
        <div className="route-connector" aria-hidden="true" />
        <div className="route-stop">
          <span className="route-marker dropoff" aria-hidden="true" />
          <div>
            <span className="label">Drop off</span>
            <p>{order.dropoffAddress}</p>
            <span className="route-distance">{deliveryDistanceLabel}</span>
          </div>
        </div>
      </div>

      <div className="order-footer-note">
        <span>{itemSummary}</span>
        <span>
          {pickupEtaMinutes != null ? `${pickupEtaMinutes} min to pickup` : "Pickup ETA pending"}
        </span>
      </div>

      <button
        className="primary-btn"
        onClick={() => navigate(`/rider/order/${order.id}`, { state: { order } })}
      >
        View Job Details
      </button>
    </article>
  );
}
