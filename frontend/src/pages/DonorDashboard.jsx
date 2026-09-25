import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Package } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function DonorDashboard() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/donations').then((res) => {
      setDonations(res.data.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Donations</h1>
          <p className="text-sm text-gray-500">Track and manage the food you've listed.</p>
        </div>
        <Link to="/donor/add" className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">
          <Plus className="w-4 h-4" /> Add Donation
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : donations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <Package className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No donations yet. Click "Add Donation" to list surplus food.</p>

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
              <p className="text-xs text-gray-400 mt-2">Expires: {new Date(d.expiry_date).toLocaleString()}</p>
              <Link to={`/donor/donations/${d.id}`} className="inline-block mt-3 text-sm text-brand-700 font-medium">
                View details →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
