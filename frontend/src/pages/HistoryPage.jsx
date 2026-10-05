import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { formatDistance, formatDuration } from '../utils';

export default function HistoryPage() {
  const [list, setList] = useState([]);

  useEffect(() => {
    api.myActivities().then(setList).catch(() => {});
  }, []);

  return (
    <div className="page pad">
      <h1>Your runs</h1>
      {list.length === 0 && <p className="muted">No activities yet. Hit Go and claim some streets.</p>}
      <div className="feed">
        {list.map((a) => (
          <Link key={a.id} to={`/activity/${a.id}`} className="feed-item">
            <div>
              <strong>{a.name}</strong>
              <span>{new Date(a.started_at).toLocaleString()}</span>
            </div>
            <div className="meta">
              <span>{formatDistance(a.distance_m)}</span>
              <span>{formatDuration(a.duration_s)}</span>
              <span className="cells">+{a.territory_claimed}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
