import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Search } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function NgoDashboard() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    api.get('/donations').then((res) => {
      setDonations(res.data.data);
      setLoading(false);
    });
  }

  async function requestFood(donationId) {
    setRequestingId(donationId);
    setMessage('');
    try {
      await api.post('/requests', { donation_id: donationId });
      setMessage('Request submitted. The donor has been notified.');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not submit request.');
    } finally {
      setRequestingId(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Available Food Nearby</h1>
          <p className="text-sm text-gray-500">Request donations for your NGO to collect.</p>
        </div>
        <Link to="/ngo/requests" className="flex items-center gap-1.5 text-sm text-brand-700 font-medium hover:underline">
          <ClipboardList className="w-4 h-4" /> My Requests
        </Link>
      </div>

      {message && <p className="text-sm text-brand-700 bg-brand-50 rounded-lg px-3 py-2 mb-4">{message}</p>}

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : donations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No available donations right now. Check back soon.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {donations.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-gray-900">{d.food_name}</h3>
                <StatusBadge status={d.status} />
              </div>
              <p className="text-sm text-gray-500 mt-1">{d.quantity} · {d.food_type}</p>
              <p className="text-sm text-gray-500 mt-1">{d.pickup_address}</p>
              <p className="text-xs text-gray-400 mt-1">By {d.donor_name}</p>
              <p className="text-xs text-gray-400 mt-1">Expires: {new Date(d.expiry_date).toLocaleString()}</p>
              <button
                disabled={requestingId === d.id}
                onClick={() => requestFood(d.id)}
                className="mt-3 w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-md"
              >
                {requestingId === d.id ? 'Requesting…' : 'Request Food'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
