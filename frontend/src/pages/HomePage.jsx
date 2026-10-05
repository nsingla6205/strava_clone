import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { api } from '../api';
import TerritoryMap from '../components/TerritoryMap';
import useGeolocation from '../hooks/useGeolocation';
import { formatDistance, cellAreaKm2 } from '../utils';

export default function HomePage() {
  const { stats, refresh } = useAuth();
  const { position: myLocation } = useGeolocation();
  const [cells, setCells] = useState([]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onBounds = useCallback((bbox) => {
    api.territory(bbox).then(setCells).catch(() => {});
  }, []);

  const center = myLocation ? [myLocation.lat, myLocation.lng] : [37.7749, -122.4194];

  return (
    <div className="page home map-panel">
      <TerritoryMap
        center={center}
        cells={cells}
        myLocation={myLocation}
        recenterOnLocation
        onBounds={onBounds}
        className="map full"
      />
      <div className="map-stats">
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
      <Link to="/run" className="btn primary go float-go" aria-label="Start a run">
        Go
      </Link>
    </div>
  );
}
