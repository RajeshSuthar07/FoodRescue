import { useState } from 'react';
import { User, Phone, MapPin, KeyRound, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LocationPicker from '../components/LocationPicker';

export default function Profile() {
  const { user, refreshUser } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });
  const [location, setLocation] = useState(
    user?.latitude && user?.longitude
      ? { lat: Number(user.latitude), lng: Number(user.longitude), address: user.address }
      : null
  );
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileBusy, setProfileBusy] = useState(false);

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [pwBusy, setPwBusy] = useState(false);

  async function saveProfile(e) {
    e.preventDefault();
    setProfileMsg(null);
    setProfileBusy(true);
    try {
      const payload = { ...form };
      if (location) {
        payload.latitude = location.lat;
        payload.longitude = location.lng;
        payload.address = location.address || form.address;
      }
      await api.put('/auth/profile', payload);
      await refreshUser();
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Could not update profile.' });
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwMsg(null);

    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    if (pwForm.new_password.length < 6) {
      setPwMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    setPwBusy(true);
    try {
      await api.put('/auth/change-password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.message || 'Could not change password.' });
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-sm text-gray-500">Manage your profile, location, and password.</p>
      </div>

      {/* Profile card */}
      <form onSubmit={saveProfile} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-brand-700" />
          <h2 className="font-semibold text-gray-900">Profile</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> Phone
            </label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input
            disabled
            value={user?.email || ''}
            className="mt-1 w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500"
          />
          <p className="text-xs text-gray-400 mt-1">Email can't be changed here.</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-1">
            <MapPin className="w-3.5 h-3.5" /> Address / Location
          </label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Type an address, or pick one on the map below"
          />
          <LocationPicker onChange={setLocation} initialAddress={form.address} />
        </div>

        {profileMsg && (
          <div
            className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
              profileMsg.type === 'success' ? 'bg-brand-50 text-brand-800' : 'bg-red-50 text-red-700'
            }`}
          >
            {profileMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <span>{profileMsg.text}</span>
          </div>
        )}

        <button
          disabled={profileBusy}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          <Save className="w-4 h-4" />
          {profileBusy ? 'Saving…' : 'Save Profile'}
        </button>
      </form>

      {/* Password card */}
      <form onSubmit={savePassword} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-4 h-4 text-brand-700" />
          <h2 className="font-semibold text-gray-900">Change Password</h2>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Current password</label>
          <input
            type="password"
            required
            value={pwForm.current_password}
            onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">New password</label>
            <input
              type="password"
              required
              minLength={6}
              value={pwForm.new_password}
              onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Confirm new password</label>
            <input
              type="password"
              required
              minLength={6}
              value={pwForm.confirm_password}
              onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {pwMsg && (
          <div
            className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
              pwMsg.type === 'success' ? 'bg-brand-50 text-brand-800' : 'bg-red-50 text-red-700'
            }`}
          >
            {pwMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <span>{pwMsg.text}</span>
          </div>
        )}

        <button
          disabled={pwBusy}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          <KeyRound className="w-4 h-4" />
          {pwBusy ? 'Updating…' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}
