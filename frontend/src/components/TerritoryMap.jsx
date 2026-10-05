import { useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Polygon,
  Circle,
  CircleMarker,
  Marker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const locationIcon = L.divIcon({
  className: 'loc-marker',
  html: `
    <div class="loc-pulse"></div>
    <div class="loc-dot">
      <span class="loc-core"></span>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function FitBounds({ path, cells }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current) return;
    const pts = [];
    (path || []).forEach((p) => pts.push([p.lat, p.lng]));
    (cells || []).slice(0, 200).forEach((c) => {
      c.bounds?.forEach((b) => pts.push([b.lat, b.lng]));
    });
    if (pts.length >= 2) {
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
      fitted.current = true;
    } else if (pts.length === 1) {
      map.setView(pts[0], 16);
      fitted.current = true;
    }
  }, [map, path, cells]);

  return null;
}

function FollowRunner({ position, follow }) {
  const map = useMap();
  useEffect(() => {
    if (follow && position) map.panTo(position, { animate: true });
  }, [map, position, follow]);
  return null;
}

function RecenterOnLocation({ location, enabled }) {
  const map = useMap();
  const done = useRef(false);

  useEffect(() => {
    if (!enabled || !location || done.current) return;
    map.setView([location.lat, location.lng], Math.max(map.getZoom(), 16), { animate: true });
    done.current = true;
  }, [map, location, enabled]);

  return null;
}

function LocateControl({ location }) {
  const map = useMap();
  const locationRef = useRef(location);
  locationRef.current = location;

  useEffect(() => {
    const control = L.control({ position: 'topright' });
    control.onAdd = () => {
      const btn = L.DomUtil.create('button', 'locate-btn');
      btn.type = 'button';
      btn.title = 'My location';
      btn.setAttribute('aria-label', 'Go to my location');
      btn.innerHTML = '<span class="locate-icon"></span>';
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.on(btn, 'click', (e) => {
        L.DomEvent.stop(e);
        const loc = locationRef.current;
        if (!loc) return;
        map.setView([loc.lat, loc.lng], Math.max(map.getZoom(), 16), { animate: true });
      });
      return btn;
    };
    control.addTo(map);
    return () => control.remove();
  }, [map]);

  return null;
}

function BoundsWatcher({ onBounds }) {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onBounds?.({
        minLat: b.getSouth(),
        minLng: b.getWest(),
        maxLat: b.getNorth(),
        maxLng: b.getEast(),
      });
    },
  });
  useEffect(() => {
    const b = map.getBounds();
    onBounds?.({
      minLat: b.getSouth(),
      minLng: b.getWest(),
      maxLat: b.getNorth(),
      maxLng: b.getEast(),
    });
  }, [map, onBounds]);
  return null;
}

export default function TerritoryMap({
  center = [37.7749, -122.4194],
  zoom = 14,
  path = [],
  cells = [],
  runner = null,
  myLocation = null,
  follow = false,
  fit = false,
  recenterOnLocation = false,
  showLocate = true,
  onBounds,
  className = 'map',
}) {
  const line = useMemo(() => path.map((p) => [p.lat, p.lng]), [path]);
  const last = runner || (path.length ? [path[path.length - 1].lat, path[path.length - 1].lng] : null);
  const startCenter = myLocation ? [myLocation.lat, myLocation.lng] : center;

  return (
    <MapContainer
      center={startCenter}
      zoom={zoom}
      maxZoom={19}
      className={className}
      zoomControl={false}
    >
      {/* World Street Map has street-level tiles; dark gray basemap stops ~z16 ("Map data not yet available"). */}
      <TileLayer
        attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
        maxNativeZoom={19}
      />
      {cells.map((c) => (
        <Polygon
          key={c.cell_id}
          positions={(c.bounds || []).map((b) => [b.lat, b.lng])}
          pathOptions={{
            color: c.color || '#FC4C02',
            weight: 1,
            opacity: 0.85,
            fillColor: c.color || '#FC4C02',
            fillOpacity: 0.35,
          }}
        />
      ))}
      {line.length > 1 && (
        <Polyline positions={line} pathOptions={{ color: '#FC4C02', weight: 4, opacity: 0.95 }} />
      )}
      {myLocation && (
        <>
          {myLocation.accuracy > 0 && (
            <Circle
              center={[myLocation.lat, myLocation.lng]}
              radius={Math.min(myLocation.accuracy, 120)}
              pathOptions={{
                color: '#3b82f6',
                weight: 1,
                opacity: 0.35,
                fillColor: '#3b82f6',
                fillOpacity: 0.12,
              }}
            />
          )}
          <Marker position={[myLocation.lat, myLocation.lng]} icon={locationIcon} zIndexOffset={1000} />
        </>
      )}
      {last && (
        <CircleMarker
          center={last}
          radius={8}
          pathOptions={{ color: '#fff', weight: 2, fillColor: '#FC4C02', fillOpacity: 1 }}
        />
      )}
      {fit && <FitBounds path={path} cells={cells} />}
      {follow && <FollowRunner position={last} follow={follow} />}
      {recenterOnLocation && <RecenterOnLocation location={myLocation} enabled />}
      {showLocate && <LocateControl location={myLocation} />}
      {onBounds && <BoundsWatcher onBounds={onBounds} />}
    </MapContainer>
  );
}
