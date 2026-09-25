import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import LocationPicker from '../components/LocationPicker';

export default function AddDonation() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    food_name: '', food_type: 'VEG', quantity: '', description: '', expiry_date: '',
  });
  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!location) {
      setError('Please select the pickup location on the map.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/donations', {
        ...form,
        pickup_address: location.address,
        pickup_latitude: location.lat,
        pickup_longitude: location.lng,
      });
      navigate('/donor');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create donation.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-5">Add Food Donation</h1>
      <form onSubmit={submit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Food name</label>
          <input required value={form.food_name} onChange={(e) => setForm({ ...form, food_name: e.target.value })}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Food type</label>
            <select value={form.food_type} onChange={(e) => setForm({ ...form, food_type: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="VEG">Vegetarian</option>
              <option value="NON_VEG">Non-Vegetarian</option>
              <option value="MIXED">Mixed</option>
              <option value="PACKAGED">Packaged</option>
              <option value="BAKERY">Bakery</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Quantity</label>
            <input required placeholder="e.g. 20 kg / 50 packets" value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" rows={3} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Expiry date / time</label>
          <input required type="datetime-local" value={form.expiry_date}
            onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Pickup location</label>
          <LocationPicker onChange={setLocation} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-md text-sm">
          {busy ? 'Submitting…' : 'Submit Donation'}
        </button>
      </form>
    </div>
  );
}
