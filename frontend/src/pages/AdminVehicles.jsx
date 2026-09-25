import { useEffect, useState } from 'react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({ vehicle_number: '', driver_id: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [vRes, uRes] = await Promise.all([api.get('/vehicles'), api.get('/donations')]);
    setVehicles(vRes.data.data);
    // Driver list: no dedicated /users endpoint in the minimal API, so we
    // reuse whichever vehicles already have driver info for display; add a
    // simple manual driver_id input as a pragmatic fallback for the admin.
    setDrivers([]);
  }

  async function createVehicle(e) {
    e.preventDefault();
    setMessage('');
    try {
      await api.post('/vehicles', {
        vehicle_number: form.vehicle_number,
        driver_id: form.driver_id || null,
      });
      setForm({ vehicle_number: '', driver_id: '' });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not create vehicle.');
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Vehicles</h1>

      <form onSubmit={createVehicle} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600">Vehicle number</label>
          <input required value={form.vehicle_number} onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
            placeholder="FR-103" className="mt-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Driver user id (optional)</label>
          <input value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })}
            placeholder="e.g. 6" className="mt-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm w-32" />
        </div>
        <button className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-md">
          Add Vehicle
        </button>
      </form>
      {message && <p className="text-sm text-red-600">{message}</p>}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Vehicle</th>
              <th className="px-4 py-2 font-medium">Driver</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id} className="border-t border-gray-100">
                <td className="px-4 py-2 font-medium text-gray-800">{v.vehicle_number}</td>
                <td className="px-4 py-2 text-gray-600">{v.driver_name || '—'}</td>
                <td className="px-4 py-2"><StatusBadge status={v.status} /></td>
                <td className="px-4 py-2 text-gray-500">{v.last_updated ? new Date(v.last_updated.replace(' ', 'T') + 'Z').toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        Tip: register a Driver account first (Register → role "FoodRescue Driver"), note their user id from the database,
        then attach them to a vehicle here.
      </p>
    </div>
  );
}
