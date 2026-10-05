import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import TerritoryMap from '../components/TerritoryMap';
import useGeolocation from '../hooks/useGeolocation';
import { distanceM, formatDistance, formatDuration, formatPace } from '../utils';

export default function RunPage() {
  const nav = useNavigate();
  const { position: myLocation } = useGeolocation({ watch: true });
  const [activity, setActivity] = useState(null);
  const [path, setPath] = useState([]);
  const [cells, setCells] = useState([]);
  const [claimedFlash, setClaimedFlash] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState(false);
  const watchRef = useRef(null);
  const bufferRef = useRef([]);
  const flushTimer = useRef(null);
  const demoTimer = useRef(null);
  const activityRef = useRef(null);
  const pathRef = useRef([]);
  const lastAccepted = useRef(null);

  useEffect(() => {
    activityRef.current = activity;
  }, [activity]);
  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  const flush = useCallback(async () => {
    const act = activityRef.current;
    if (!act || bufferRef.current.length === 0) return;
    const points = bufferRef.current.splice(0, bufferRef.current.length);
    try {
      const res = await api.track(act.id, points);
      setActivity(res.activity);
      setPath(res.activity.path || []);
      if (res.claimed?.length) {
        setCells((prev) => {
          const map = new Map(prev.map((c) => [c.cell_id, c]));
          res.claimed.forEach((c) => map.set(c.cell_id, c));
          return Array.from(map.values());
        });
      }
      setClaimedFlash(res.activity?.territory_claimed || 0);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    flushTimer.current = setInterval(flush, 2500);
    return () => clearInterval(flushTimer.current);
  }, [flush]);

  useEffect(() => {
    if (!activity) return;
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(activity.started_at).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [activity]);

  function pushPoint(lat, lng, { force = false } = {}) {
    const pt = { lat, lng, timestamp: Date.now() };
    const prev = lastAccepted.current;
    if (!force && prev) {
      const moved = distanceM(prev, pt);
      const dt = (pt.timestamp - prev.timestamp) / 1000;
      // Ignore GPS drift while standing still, and spikes faster than a sprint.
      if (moved < 12) return;
      if (dt > 0.2 && moved / dt > 30) return;
    }
    lastAccepted.current = pt;
    bufferRef.current.push(pt);
    setPath((p) => [...p, pt]);
  }

  async function start() {
    setError('');
    try {
      const act = await api.startActivity('Territory Run');
      setActivity(act);
      setPath([]);
      lastAccepted.current = null;
      setClaimedFlash(0);
      setElapsed(0);

      // Load nearby territory
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          pushPoint(lat, lng, { force: true });
          const bbox = { minLat: lat - 0.02, minLng: lng - 0.02, maxLat: lat + 0.02, maxLng: lng + 0.02 };
          try {
            setCells(await api.territory(bbox));
          } catch {
            /* ignore */
          }
        });
      }

      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude: lat, longitude: lng, accuracy } = pos.coords;
          if (accuracy && accuracy > 80) return;
          pushPoint(lat, lng);
        },
        (err) => setError(err.message),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
      );
    } catch (err) {
      setError(err.message);
    }
  }

  function startDemo() {
    setDemo(true);
    // Simulated city loop if GPS unavailable (indoor / desktop).
    start().then(() => {
      let angle = 0;
      const baseLat = 37.7749 + (Math.random() - 0.5) * 0.01;
      const baseLng = -122.4194 + (Math.random() - 0.5) * 0.01;
      let lat = baseLat;
      let lng = baseLng;
      pushPoint(lat, lng, { force: true });
      demoTimer.current = setInterval(() => {
        angle += 0.12;
        lat += Math.cos(angle) * 0.00012;
        lng += Math.sin(angle) * 0.00012;
        pushPoint(lat, lng);
      }, 800);
    });
  }

  async function finish() {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    if (demoTimer.current) clearInterval(demoTimer.current);
    await flush();
    try {
      const act = await api.finish(activity.id, 'Territory Run');
      nav(`/activity/${act.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
      if (demoTimer.current) clearInterval(demoTimer.current);
    };
  }, []);

  const distance = activity?.distance_m ?? 0;
  const center = path.length
    ? [path[path.length - 1].lat, path[path.length - 1].lng]
    : myLocation
      ? [myLocation.lat, myLocation.lng]
      : [37.7749, -122.4194];

  return (
    <div className="page run">
      <TerritoryMap
        center={center}
        path={path}
        cells={cells}
        myLocation={myLocation}
        recenterOnLocation={!activity}
        follow={!!activity}
        className="map full"
      />

      <div className="run-hud">
        {!activity ? (
          <div className="run-start">
            <h1>Claim territory</h1>
            <p>Every street you run paints the map in your color. Steal cells from rivals by running through them.</p>
            {error && <p className="error">{error}</p>}
            <button className="btn primary large" onClick={start}>
              Start GPS run
            </button>
            <button className="btn ghost" onClick={startDemo}>
              Demo mode (no GPS)
            </button>
          </div>
        ) : (
          <>
            <div className="run-stats">
              <div>
                <span className="label">Time</span>
                <strong>{formatDuration(elapsed)}</strong>
              </div>
              <div>
                <span className="label">Distance</span>
                <strong>{formatDistance(distance)}</strong>
              </div>
              <div>
                <span className="label">Pace</span>
                <strong>{formatPace(distance, elapsed)}</strong>
              </div>
              <div>
                <span className="label">Claimed</span>
                <strong className="accent">+{claimedFlash}</strong>
              </div>
            </div>
            {demo && <p className="muted tiny center">Demo trail active — walk the loop on the map</p>}
            {error && <p className="error">{error}</p>}
            <button className="btn danger large" onClick={finish}>
              Finish & save
            </button>
          </>
        )}
      </div>
    </div>
  );
}
