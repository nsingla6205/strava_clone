import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { formatDistance, formatDuration, cellAreaKm2 } from '../utils';

export default function LeaderboardPage() {
  const [rows, setRows] = useState([]);
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    api.leaderboard().then(setRows).catch(() => {});
    api.feed().then(setFeed).catch(() => {});
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

      <h2 className="section-title">Recent conquests</h2>
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
    </div>
  );
}
