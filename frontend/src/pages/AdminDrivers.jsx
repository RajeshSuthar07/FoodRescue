import { useEffect, useState } from 'react';
import { UserCheck, UserX, Phone, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-brand-100 text-brand-700',
  REJECTED: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-gray-200 text-gray-600',
  INACTIVE: 'bg-gray-200 text-gray-600',
};

export default function AdminDrivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/users/drivers');
      setDrivers(res.data.data.drivers);
    } finally {
      setLoading(false);
    }
  }

  async function approve(id) {
    setBusyId(id);
    setMessage(null);
    try {
      await api.put(`/users/drivers/${id}/approve`);
      setMessage({ type: 'success', text: 'Driver approved.' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Could not approve driver.' });
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id) {
    setBusyId(id);
    setMessage(null);
    try {
      await api.put(`/users/drivers/${id}/reject`);
      setMessage({ type: 'success', text: 'Driver rejected.' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Could not reject driver.' });
    } finally {
      setBusyId(null);
    }
  }

  const pending = drivers.filter((d) => d.status === 'PENDING');
  const others = drivers.filter((d) => d.status !== 'PENDING');

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Driver Approvals</h1>
        <p className="text-sm text-gray-500">Review new driver registrations before they can log in.</p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
            message.type === 'success' ? 'bg-brand-50 text-brand-800' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-amber-600" />
              <h2 className="font-semibold text-gray-900">Pending Approval ({pending.length})</h2>
            </div>
            {pending.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-500 text-sm">
                No drivers waiting for approval.
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((d) => (
                  <div key={d.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{d.name}</p>
                      <p className="text-xs text-gray-500">{d.email}</p>
                      {d.phone && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {d.phone}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        disabled={busyId === d.id}
                        onClick={() => approve(d.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium disabled:opacity-60"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        disabled={busyId === d.id}
                        onClick={() => reject(d.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-red-200 hover:bg-red-50 text-red-700 font-medium disabled:opacity-60"
                      >
                        <UserX className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="font-semibold text-gray-900 mb-3">All Drivers</h2>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Email</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {others.map((d) => (
                    <tr key={d.id} className="border-t border-gray-100">
                      <td className="px-4 py-2 font-medium text-gray-800">{d.name}</td>
                      <td className="px-4 py-2 text-gray-600">{d.email}</td>
                      <td className="px-4 py-2">
                        <span className={`status-badge ${STATUS_STYLES[d.status] || 'bg-gray-100 text-gray-700'}`}>
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {others.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                        No other drivers yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
