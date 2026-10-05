import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatDistance, cellAreaKm2 } from '../utils';

export default function LeaderboardPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.leaderboard().then(setRows).catch(() => {});
  }, []);

  return (
    <div className="page pad leaderboard">
      <h1>Territory kings</h1>
      <p className="muted">Most cells owned across the map.</p>
      <ol className="board">
        {rows.map((r, i) => (
          <li key={r.user_id}>
            <span className="rank">{i + 1}</span>
            <span className="dot" style={{ background: r.color }} />
            <div>
              <strong>{r.username}</strong>
              <small>
                {r.cells} cells · {cellAreaKm2(r.cells)} km² · {formatDistance(r.distance_m)}
              </small>
            </div>
          </li>
        ))}
      </ol>
      {rows.length === 0 && <p className="muted">No territory claimed yet.</p>}
    </div>
  );
}
