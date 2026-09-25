import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications').then((res) => {
      setItems(res.data.data);
      setLoading(false);
    });
  }, []);

  async function markRead(id) {
    await api.put(`/notifications/${id}/read`);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-5">Notifications</h1>
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-500">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              className={`w-full text-left p-4 rounded-xl border shadow-sm ${
                n.is_read ? 'bg-white border-gray-100' : 'bg-brand-50 border-brand-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900 text-sm">{n.title}</p>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-brand-600" />}
              </div>
              <p className="text-sm text-gray-600 mt-1">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at.replace(' ', 'T') + 'Z').toLocaleString()}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
