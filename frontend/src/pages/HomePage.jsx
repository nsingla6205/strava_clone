import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { api } from '../api';
import TerritoryMap from '../components/TerritoryMap';
import useGeolocation from '../hooks/useGeolocation';
import { formatDistance, formatDuration, cellAreaKm2 } from '../utils';

export default function HomePage() {
  const { user, stats, refresh } = useAuth();
  const { position: myLocation } = useGeolocation();
  const [cells, setCells] = useState([]);
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    refresh();
    api.feed().then(setFeed).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onBounds = useCallback((bbox) => {
    api.territory(bbox).then(setCells).catch(() => {});
  }, []);

  const center = myLocation ? [myLocation.lat, myLocation.lng] : [37.7749, -122.4194];

  return (
    <div className="page home">
      <section className="map-panel">
        <TerritoryMap
          center={center}
          cells={cells}
          myLocation={myLocation}
          recenterOnLocation
          onBounds={onBounds}
          className="map full"
        />
        <div className="map-overlay">
          <div className="stats-row">
            <div>
              <span className="label">Territory</span>
              <strong>{stats?.cells ?? 0} cells</strong>
              <small>{cellAreaKm2(stats?.cells ?? 0)} km²</small>
            </div>
            <div>
              <span className="label">Distance</span>
              <strong>{formatDistance(stats?.distance_m ?? 0)}</strong>
              <small>{stats?.activities ?? 0} runs</small>
            </div>
          </div>
          <Link to="/run" className="btn primary go">
            Go
          </Link>
        </div>
      </section>

      <section className="feed">
        <h2>Recent conquests</h2>
        {feed.length === 0 && <p className="muted">No runs yet — be the first to paint the map.</p>}
        {feed.map((a) => (
          <Link key={a.id} to={`/activity/${a.id}`} className="feed-item">
            <span className="dot" style={{ background: a.user_color }} />
            <div>
              <strong>{a.username}</strong>
              <span>{a.name}</span>
            </div>
            <div className="meta">
              <span>{formatDistance(a.distance_m)}</span>
              <span>{formatDuration(a.duration_s)}</span>
              <span className="cells">+{a.territory_claimed} cells</span>
            </div>
          </Link>
        ))}
        {user && (
          <p className="muted tiny">
            Signed in as <span style={{ color: user.color }}>{user.username}</span>
          </p>
        )}
      </section>
    </div>
  );
}
