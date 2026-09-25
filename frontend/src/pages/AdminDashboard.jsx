import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, CheckCircle2, Truck, Users, Building2, Car, Clock, ArrowRight } from 'lucide-react';
import api from '../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pendingDrivers, setPendingDrivers] = useState([]);

  useEffect(() => {
    api.get('/reports/dashboard').then((res) => setStats(res.data.data));
    api.get('/users/drivers').then((res) => {
      setPendingDrivers(res.data.data.drivers.filter((d) => d.status === 'PENDING'));
    });
  }, []);

  const cards = stats
    ? [
        { label: 'Total Donations', value: stats.total_donations, icon: Package, color: 'text-brand-600 bg-brand-50' },
        { label: 'Available Now', value: stats.available_donations, icon: Package, color: 'text-sky-600 bg-sky-50' },
        { label: 'Completed', value: stats.completed_donations, icon: CheckCircle2, color: 'text-teal-600 bg-teal-50' },
        { label: 'Active Trips', value: stats.active_trips, icon: Truck, color: 'text-indigo-600 bg-indigo-50' },
        { label: 'Donors', value: stats.total_donors, icon: Users, color: 'text-amber-600 bg-amber-50' },
        { label: 'NGOs', value: stats.total_ngos, icon: Building2, color: 'text-purple-600 bg-purple-50' },
        { label: 'Drivers', value: stats.total_drivers, icon: Truck, color: 'text-rose-600 bg-rose-50' },
        { label: 'Vehicles', value: stats.total_vehicles, icon: Car, color: 'text-gray-600 bg-gray-100' },
      ]
    : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Overview of the FoodRescue platform.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link to="/admin/assign" className="px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium">
            Assign Vehicle
          </Link>
          <Link to="/admin/vehicles" className="px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium">
            Vehicles
          </Link>
          <Link to="/admin/drivers" className="px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium">
            Drivers
          </Link>
        </div>
      </div>

      {pendingDrivers.length > 0 && (
        <Link
          to="/admin/drivers"
          className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {pendingDrivers.length} driver{pendingDrivers.length > 1 ? 's' : ''} waiting for approval
              </p>
              <p className="text-xs text-amber-700">Review and approve or reject new driver registrations.</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-600 shrink-0" />
        </Link>
      )}

      {!stats ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${c.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{c.value}</p>
                <p className="text-xs text-gray-500 mt-1">{c.label}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
