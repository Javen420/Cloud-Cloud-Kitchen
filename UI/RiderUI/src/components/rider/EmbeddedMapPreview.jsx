const MODE_TO_DIRFLG = {
  driving: "d",
  walking: "w",
  bicycling: "b",
  transit: "r",
};

function buildDirectionsEmbedUrl(from, to, mode = "driving") {
  const params = new URLSearchParams({
    output: "embed",
    saddr: from,
    daddr: to,
    dirflg: MODE_TO_DIRFLG[mode] || MODE_TO_DIRFLG.driving,
  });
  return `https://www.google.com/maps?${params.toString()}`;
}

export default function EmbeddedMapPreview({
  from,
  to,
  mode = "driving",
  className = "live-map-frame",
}) {
  if (!from || !to) {
    return (
      <div className="fake-map">
        <p className="map-caption">Map preview unavailable</p>
      </div>
    );
  }

  return (
    <div className="map-frame-shell">
      <iframe
        title="Route map preview"
        className={className}
        src={buildDirectionsEmbedUrl(from, to, mode)}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
