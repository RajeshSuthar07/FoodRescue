import { useCallback, useRef, useState } from 'react';
import api from '../services/api';

const SEND_INTERVAL_MS = 4000; // 3-5s target

/**
 * Wraps navigator.geolocation.watchPosition() and posts real GPS fixes to
 * POST /api/tracking/update-location on a throttled interval (not on every
 * watchPosition callback, which can fire much more often than needed).
 */
export default function useDriverGPS(vehicleId) {
  const [status, setStatus] = useState('idle'); // idle | requesting | active | denied | unavailable
  const [lastFix, setLastFix] = useState(null); // { lat, lng, accuracy, speed, heading, at }
  const [lastSentAt, setLastSentAt] = useState(null);
  const [sendError, setSendError] = useState(null);

  const watchIdRef = useRef(null);
  const lastSendRef = useRef(0);
  const latestPositionRef = useRef(null);

  const sendFix = useCallback(
    async (fix) => {
      try {
        await api.post('/tracking/update-location', {
          vehicle_id: vehicleId,
          latitude: fix.lat,
          longitude: fix.lng,
          accuracy: fix.accuracy,
          heading: fix.heading,
          speed: fix.speed,
        });
        setLastSentAt(new Date());
        setSendError(null);
      } catch (err) {
        setSendError(err.response?.data?.message || 'Failed to send GPS update.');
      }
    },
    [vehicleId]
  );

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    setStatus('requesting');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const fix = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed != null ? position.coords.speed * 3.6 : null, // m/s -> km/h
          heading: position.coords.heading,
          at: new Date(),
        };
        latestPositionRef.current = fix;
        setLastFix(fix);
        setStatus('active');

        const now = Date.now();
        if (now - lastSendRef.current >= SEND_INTERVAL_MS) {
          lastSendRef.current = now;
          sendFix(fix);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
        } else {
          setStatus('unavailable');
        }
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );
  }, [sendFix]);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setStatus('idle');
  }, []);

  return { status, lastFix, lastSentAt, sendError, start, stop };
}
