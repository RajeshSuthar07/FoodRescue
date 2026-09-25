import { useEffect, useRef, useState } from 'react';
import api from '../services/api';

const POLL_INTERVAL_MS = 4000; // 3-5s target

/**
 * Polls GET /api/tracking/assignment/{id} on an interval and exposes the
 * latest assignment/vehicle state. Never invents data — if the vehicle has
 * no GPS fix yet, vehiclePosition stays null and the UI must show
 * "Waiting for driver GPS...".
 */
export default function useTrackingPoll(assignmentId) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [secondsAgo, setSecondsAgo] = useState(null);
  const intervalRef = useRef(null);
  const tickRef = useRef(null);

  useEffect(() => {
    if (!assignmentId) return;

    let cancelled = false;

    async function fetchOnce() {
      try {
        const res = await api.get(`/tracking/assignment/${assignmentId}`);
        if (!cancelled) {
          setData(res.data.data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load tracking data.');
      }
    }

    fetchOnce();
    intervalRef.current = setInterval(fetchOnce, POLL_INTERVAL_MS);

    tickRef.current = setInterval(() => {
      setData((prev) => {
        if (prev?.assignment?.last_updated) {
          const diff = Math.floor((Date.now() - new Date(prev.assignment.last_updated.replace(' ', 'T') + 'Z').getTime()) / 1000);
          setSecondsAgo(diff >= 0 ? diff : null);
        }
        return prev;
      });
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(intervalRef.current);
      clearInterval(tickRef.current);
    };
  }, [assignmentId]);

  return { data, error, secondsAgo };
}
