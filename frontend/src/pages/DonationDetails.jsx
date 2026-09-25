import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function DonationDetails() {
  const { id } = useParams();
  const [donation, setDonation] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [donRes, reqRes] = await Promise.all([
      api.get(`/donations/${id}`),
      api.get('/requests'),
    ]);
    setDonation(donRes.data.data);
    setRequests(reqRes.data.data.filter((r) => String(r.donation_id) === String(id)));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(reqId) {
    setBusyId(reqId);
    setError('');
    try {
      await api.put(`/requests/${reqId}/approve`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not approve request.');
    } finally {
      setBusyId(null);
    }
  }

  async function reject(reqId) {
    setBusyId(reqId);
    setError('');
    try {
      await api.put(`/requests/${reqId}/reject`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reject request.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className="p-6 text-gray-500">Loading…</div>;
  if (!donation) return <div className="p-6 text-gray-500">Donation not found.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{donation.food_name}</h1>
            <p className="text-sm text-gray-500">{donation.quantity} · {donation.food_type}</p>
          </div>
          <StatusBadge status={donation.status} />
        </div>
        <p className="text-sm text-gray-600 mt-3">{donation.description}</p>
        <p className="text-sm text-gray-500 mt-2">Pickup: {donation.pickup_address}</p>
        <p className="text-xs text-gray-400 mt-1">Expires: {new Date(donation.expiry_date).toLocaleString()}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-3">NGO Requests</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-500">No requests yet.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.ngo_name}</p>
                  <p className="text-xs text-gray-500">{r.ngo_phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  {r.status === 'Pending' && (
                    <>
                      <button disabled={busyId === r.id} onClick={() => approve(r.id)}
                        className="px-3 py-1.5 text-xs rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium disabled:opacity-60">
                        Approve
                      </button>
                      <button disabled={busyId === r.id} onClick={() => reject(r.id)}
                        className="px-3 py-1.5 text-xs rounded-md border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium disabled:opacity-60">
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </div>

      {donation.assignment_id && (
        <Link to={`/tracking/${donation.assignment_id}`} className="block text-center bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-md">
          View Live Pickup Tracking
        </Link>
      )}
    </div>
  );
}
