import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Truck, MapPinOff, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import useDriverGPS from '../hooks/useDriverGPS';
import StatusBadge from '../components/StatusBadge';

const GPS_STATUS_LABEL = {
  idle: 'Not started',
  requesting: 'Requesting permission…',
  active: 'Connected',
  denied: 'Permission denied',
  unavailable: 'GPS unavailable',
};

export default function DriverDashboard() {
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const gps = useDriverGPS(vehicle?.id);

  const load = useCallback(async () => {
    try {
      const vehiclesRes = await api.get('/vehicles');
      const mine = vehiclesRes.data.data.find((v) => v.driver_id === user.id);
      setVehicle(mine || null);

      if (mine) {
        // We don't have a direct "my active assignment" endpoint in the
        // minimal API, so we look it up via vehicle tracking info.
        const trackRes = await api.get(`/tracking/vehicle/${mine.id}`);
        setAssignment(trackRes.data.data.assignment);
      }
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep GPS watch running whenever there's an active trip that has moved
  // past "Assigned" (i.e. the driver clicked Start Trip).
  useEffect(() => {
    if (assignment && assignment.status !== 'Assigned' && assignment.status !== 'Completed' && gps.status === 'idle') {
      gps.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment]);

  async function startTrip() {
    setActionError('');
    setActionBusy(true);
    try {
      gps.start();
      const res = await api.put(`/assignments/${assignment.id}/start`);
      setAssignment(res.data.data);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Could not start trip.');
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmPickup() {
    setActionBusy(true);
    setActionError('');
    try {
      const res = await api.put(`/assignments/${assignment.id}/pickup`);
      setAssignment(res.data.data);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Could not confirm pickup.');
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmDelivery() {
    setActionBusy(true);
    setActionError('');
    try {
      const res = await api.put(`/assignments/${assignment.id}/deliver`);
      setAssignment(res.data.data);
      gps.stop();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Could not confirm delivery.');
    } finally {
      setActionBusy(false);
    }
  }

  function stopTrip() {
    gps.stop();
  }

  if (loading) return <div className="p-6 text-gray-500">Loading…</div>;

  if (!vehicle) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <MapPinOff className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No vehicle is currently assigned to your driver account. Contact the admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Driver Dashboard</h1>
          <p className="text-sm text-gray-500">{user.name} · Vehicle {vehicle.vehicle_number}</p>
        </div>
      </div>

      {!assignment ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No active trip right now.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Current Trip</h2>
            <StatusBadge status={assignment.status} />
          </div>

          <div className="text-sm space-y-1 text-gray-700">
            <p><span className="text-gray-500">Food:</span> {assignment.food_name}</p>
            <p><span className="text-gray-500">Pickup:</span> {assignment.pickup_address}</p>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">GPS permission status</span>
              <span className={gps.status === 'active' ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                {GPS_STATUS_LABEL[gps.status]}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Last GPS update</span>
              <span className="text-gray-800">{gps.lastSentAt ? gps.lastSentAt.toLocaleTimeString() : '—'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Current latitude</span>
              <span className="text-gray-800">{gps.lastFix ? gps.lastFix.lat.toFixed(6) : '—'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Current longitude</span>
              <span className="text-gray-800">{gps.lastFix ? gps.lastFix.lng.toFixed(6) : '—'}</span>
            </div>
            {gps.lastFix?.accuracy > 50 && (
              <p className="text-xs text-amber-600">GPS accuracy low ({gps.lastFix.accuracy.toFixed(0)} m)</p>
            )}
            {gps.status === 'denied' && (
              <p className="text-xs text-red-600">
                Location permission is required to start live vehicle tracking.
              </p>
            )}
            {gps.sendError && <p className="text-xs text-red-600">{gps.sendError}</p>}
          </div>

          {gps.status === 'active' && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-md px-3 py-2">
              Keep this page open while driving to send live GPS updates.
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {assignment.status === 'Assigned' && (
              <button onClick={startTrip} disabled={actionBusy}
                className="px-4 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-60">
                Start Trip
              </button>
            )}
            {['On the Way', 'Arrived at Pickup'].includes(assignment.status) && (
              <button onClick={confirmPickup} disabled={actionBusy}
                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-60">
                Confirm Pickup
              </button>
            )}
            {['Delivering', 'Arrived at NGO'].includes(assignment.status) && (
              <button onClick={confirmDelivery} disabled={actionBusy}
                className="px-4 py-2 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium disabled:opacity-60">
                Confirm Delivery
              </button>
            )}
            {gps.status === 'active' && (
              <button onClick={stopTrip}
                className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium">
                Stop GPS
              </button>
            )}
            <Link to={`/tracking/${assignment.id}`}
              className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium">
              View Live Map
            </Link>
          </div>

          {actionError && <p className="text-sm text-red-600">{actionError}</p>}
        </div>
      )}
    </div>
  );
}
