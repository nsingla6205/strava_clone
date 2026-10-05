import { useEffect, useState } from 'react';

export default function useGeolocation({ watch = true, enableHighAccuracy = true } = {}) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return undefined;
    }

    const onOk = (pos) => {
      setPosition({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
      setError('');
    };
    const onErr = (err) => setError(err.message || 'Location unavailable');

    const opts = { enableHighAccuracy, maximumAge: 5000, timeout: 15000 };

    if (watch) {
      const id = navigator.geolocation.watchPosition(onOk, onErr, opts);
      return () => navigator.geolocation.clearWatch(id);
    }

    navigator.geolocation.getCurrentPosition(onOk, onErr, opts);
    return undefined;
  }, [watch, enableHighAccuracy]);

  return { position, error };
}
