import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import TerritoryMap from '../components/TerritoryMap';
import { formatDistance, formatDuration, formatPace } from '../utils';

export default function ActivityPage() {
  const { id } = useParams();
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .activity(id)
      .then(setActivity)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="page pad"><p className="error">{error}</p></div>;
  if (!activity) return <div className="page pad"><p className="muted">Loading…</p></div>;

  const center = activity.path?.length
    ? [activity.path[0].lat, activity.path[0].lng]
    : [37.7749, -122.4194];

  return (
    <div className="page activity">
      <TerritoryMap
        center={center}
        path={activity.path || []}
        fit
        className="map activity-map"
      />
      <div className="activity-detail">
        <Link to="/" className="back">← Feed</Link>
        <h1>{activity.name}</h1>
        <p className="by">
          <span className="dot" style={{ background: activity.user_color }} />
          {activity.username}
        </p>
        <div className="run-stats">
          <div>
            <span className="label">Distance</span>
            <strong>{formatDistance(activity.distance_m)}</strong>
          </div>
          <div>
            <span className="label">Time</span>
            <strong>{formatDuration(activity.duration_s)}</strong>
          </div>
          <div>
            <span className="label">Pace</span>
            <strong>{formatPace(activity.distance_m, activity.duration_s)}</strong>
          </div>
          <div>
            <span className="label">Territory</span>
            <strong className="accent">+{activity.territory_claimed}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
