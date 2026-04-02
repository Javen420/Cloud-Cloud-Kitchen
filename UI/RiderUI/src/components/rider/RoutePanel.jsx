import { useState } from "react";
import EmbeddedMapPreview from "./EmbeddedMapPreview";

export default function RoutePanel({
  title,
  eta,
  from,
  to,
  source,
  distanceKm,
  mapFrom,
  mapTo,
}) {
  const [mode, setMode] = useState("driving");
  const modes = [
    { id: "driving", label: "Drive" },
    { id: "walking", label: "Walk" },
    { id: "bicycling", label: "Bike" },
    { id: "transit", label: "Transit" },
  ];

  return (
    <section className="card route-panel">
      <div className="route-header">
        <div>
          <h3>{title}</h3>
          <p className="muted">Estimated travel time: {eta}</p>
        </div>
        <div className="eta-badge">{eta}</div>
      </div>

      <div className="transport-toggle" role="tablist" aria-label="Transport mode">
        {modes.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`transport-chip${mode === option.id ? " active" : ""}`}
            onClick={() => setMode(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {(distanceKm != null || source) && (
        <div className="completion-summary">
          {distanceKm != null && (
            <div>
              <span className="label">Distance</span>
              <p>{distanceKm.toFixed(1)} km</p>
            </div>
          )}
          {source && (
            <div>
              <span className="label">Source</span>
              <p>{source}</p>
            </div>
          )}
        </div>
      )}

      <EmbeddedMapPreview from={mapFrom || from} to={mapTo || to} mode={mode} />

      <div className="route-addresses">
        <div>
          <span className="label">From</span>
          <p>{from}</p>
        </div>
        <div>
          <span className="label">To</span>
          <p>{to}</p>
        </div>
      </div>
    </section>
  );
}
