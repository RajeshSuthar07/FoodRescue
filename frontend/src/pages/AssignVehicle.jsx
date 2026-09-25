import { useEffect, useState } from 'react';
import api from '../services/api';

export default function AssignVehicle() {
  const [requests, setRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    // Admins find work-to-do by looking at donations that are Approved but
    // don't have a vehicle yet (the /requests list endpoint is scoped to
    // NGO/Donor views only).
    const [donationsRes, vehRes] = await Promise.all([
      api.get('/donations'),
      api.get('/vehicles'),
    ]);
    setRequests(donationsRes.data.data.filter((d) => d.status === 'Approved'));
    setVehicles(vehRes.data.data.filter((v) => v.status === 'Available'));
  }

  async function assign(donation) {
    const vehicleId = selected[donation.id];
    if (!vehicleId) {
      setMessage('Select a vehicle first.');
      return;
    }
    setBusyId(donation.id);
    setMessage('');
    try {
      // We need the request_id for this donation — fetch its (approved) request.
      const detail = await api.get(`/donations/${donation.id}`);
      // The backend only exposes request approve/reject by NGO/Donor views;
      // for simplicity we look up the latest approved food_request via donation.
      await api.post('/assignments', {
        vehicle_id: vehicleId,
        request_id: detail.data.data.approved_request_id,
      });
      setMessage('Vehicle assigned successfully.');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not assign vehicle.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-5">Assign Vehicle</h1>
      {message && <p className="text-sm text-brand-700 bg-brand-50 rounded-md px-3 py-2 mb-4">{message}</p>}

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-500">
          No approved requests waiting for a vehicle right now.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">{d.food_name}</p>
                <p className="text-xs text-gray-500">{d.pickup_address}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selected[d.id] || ''}
                  onChange={(e) => setSelected({ ...selected, [d.id]: e.target.value })}
                  className="border border-gray-300 rounded-md text-sm px-2 py-1.5"
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.vehicle_number} — {v.driver_name || 'No driver'}</option>
                  ))}
                </select>
                <button
                  disabled={busyId === d.id}
                  onClick={() => assign(d)}
                  className="px-3 py-1.5 text-sm rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium disabled:opacity-60"
                >
                  Assign
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
