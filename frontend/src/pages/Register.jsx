import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useAuth } from '../context/AuthContext';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const ROLE_HOME = {
  DONOR: '/donor',
  NGO: '/ngo',
  DRIVER: '/driver',
  ADMIN: '/admin'
};

// Default location: Ahmedabad
const DEFAULT_LOCATION = [23.0225, 72.5714];

/* -------------------------------------------------------
   Move map when selected location changes
------------------------------------------------------- */
function MapMover({ latitude, longitude }) {
  const map = useMap();

  if (latitude && longitude) {
    map.setView(
      [Number(latitude), Number(longitude)],
      16,
      { animate: true }
    );
  }

  return null;
}

/* -------------------------------------------------------
   Select location by clicking map
------------------------------------------------------- */
function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    }
  });

  return null;
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'DONOR',
    address: '',
    latitude: '',
    longitude: '',
    vehicle_number: ''
  });

  const [showMap, setShowMap] = useState(false);
  const [locating, setLocating] = useState(false);
  const [gettingAddress, setGettingAddress] = useState(false);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  /* -------------------------------------------------------
     Normal input change
  ------------------------------------------------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  /* -------------------------------------------------------
     Reverse geocoding
     Latitude/Longitude -> Address
  ------------------------------------------------------- */
  const getAddressFromCoordinates = async (lat, lng) => {
    setGettingAddress(true);

    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse` +
        `?format=jsonv2` +
        `&lat=${encodeURIComponent(lat)}` +
        `&lon=${encodeURIComponent(lng)}` +
        `&zoom=18` +
        `&addressdetails=1` +
        `&accept-language=en`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Unable to get address');
      }

      const data = await response.json();
      const a = data?.address || {};

      // Prefer the actual local village/town first.
      const parts = [
        a.village,
        a.town,
        a.city,
        a.municipality,
        a.county,
        a.state_district,
        a.state,
        a.country
      ].filter(Boolean);

      const formatted = [...new Set(parts)].join(', ');

      setForm((prev) => ({
        ...prev,
        address: formatted || data.display_name || '',
        latitude: lat,
        longitude: lng
      }));

    } catch (err) {
      console.error('Reverse geocoding error:', err);

      // Coordinates are still saved even if address lookup fails
      setForm((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng
      }));

    } finally {
      setGettingAddress(false);
    }
  };

  /* -------------------------------------------------------
     Location selected from map
  ------------------------------------------------------- */
  const selectLocation = async (lat, lng) => {
    const latitude = Number(lat.toFixed(7));
    const longitude = Number(lng.toFixed(7));

    setForm((prev) => ({
      ...prev,
      latitude,
      longitude
    }));

    await getAddressFromCoordinates(latitude, longitude);
  };

  /* -------------------------------------------------------
     Browser current location
  ------------------------------------------------------- */
  const locateMe = () => {
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(7));
        const lng = Number(position.coords.longitude.toFixed(7));

        setForm((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));

        setShowMap(true);

        await getAddressFromCoordinates(lat, lng);

        setLocating(false);
      },
      (err) => {
        console.error('Location error:', err);

        setLocating(false);

        if (err.code === 1) {
          setError(
            'Location permission denied. Please allow location access or select the location manually on the map.'
          );
        } else if (err.code === 2) {
          setError('Unable to detect your location.');
        } else if (err.code === 3) {
          setError('Location request timed out.');
        } else {
          setError('Unable to get your location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  /* -------------------------------------------------------
     Submit registration
  ------------------------------------------------------- */
  const submit = async (e) => {
    e.preventDefault();

    setError('');

    // Driver must enter vehicle number
    if (
      form.role === 'DRIVER' &&
      !form.vehicle_number.trim()
    ) {
      setError('Vehicle number is required for drivers.');
      return;
    }

    // Address is required
    if (!form.address.trim()) {
      setError('Please enter your address or select it on the map.');
      return;
    }

    setBusy(true);

    try {
      const data = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
        role: form.role,
        address: form.address.trim(),
        latitude: form.latitude || null,
        longitude: form.longitude || null
      };

      // Only send vehicle number for DRIVER
      if (form.role === 'DRIVER') {
        data.vehicle_number = form.vehicle_number
          .trim()
          .toUpperCase();
      }

      const result = await register(data);

      if (result.pending) {
        // Driver registered but needs admin approval — show a clear
        // message instead of silently landing on a dashboard they can't
        // use yet.
        navigate('/login', {
          state: {
            noticeType: 'success',
            notice:
              'Registration successful! Your driver account is pending admin approval. You will be able to log in once approved.',
          },
        });
        return;
      }

      navigate(ROLE_HOME[result.user.role] || '/');
    } catch (err) {
      console.error('Registration error:', err);

      setError(
        err.response?.data?.message ||
        err.message ||
        'Registration failed.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-10">

      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-gray-100">

        {/* HEADER */}
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Create an account
        </h1>

        <p className="text-sm text-gray-500 mb-6">
          Join FoodRescue as a Donor, NGO, or Driver
        </p>

        {form.role === 'DRIVER' && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
            <p className="text-xs text-amber-800">
              Driver accounts require admin approval before you can log in. You'll be notified once your account is reviewed.
            </p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">

          {/* ROLE */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Role
            </label>

            <select
              name="role"
              value={form.role}
              onChange={(e) => {
                setForm((prev) => ({
                  ...prev,
                  role: e.target.value,
                  vehicle_number:
                    e.target.value === 'DRIVER'
                      ? prev.vehicle_number
                      : ''
                }));
              }}
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="DONOR">
                Donor
              </option>

              <option value="NGO">
                NGO
              </option>

              <option value="DRIVER">
                Driver
              </option>
            </select>
          </div>

          {/* NAME */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Full name / Organization name
            </label>

            <input
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Enter your name"
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Email
            </label>

            <input
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="example@gmail.com"
            />
          </div>

          {/* PHONE */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Phone
            </label>

            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Enter phone number"
            />
          </div>

          {/* DRIVER VEHICLE */}
          {form.role === 'DRIVER' && (
            <div>
              <label className="text-sm font-medium text-gray-700">
                Vehicle Number
              </label>

              <input
                name="vehicle_number"
                required
                value={form.vehicle_number}
                onChange={handleChange}
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm uppercase"
                placeholder="e.g. GJ01AB1234"
              />

              <p className="text-xs text-gray-500 mt-1">
                Enter the vehicle number used for FoodRescue deliveries.
              </p>
            </div>
          )}

          {/* ADDRESS */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Address
            </label>

            <input
              name="address"
              required
              value={form.address}
              onChange={handleChange}
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Enter your full address"
            />

            {/* MAP BUTTONS */}
            <div className="flex gap-2 mt-2">

              <button
                type="button"
                onClick={() => setShowMap(true)}
                className="flex-1 border border-brand-600 text-brand-700 hover:bg-brand-50 py-2 rounded-md text-sm font-medium"
              >
                📍 Select on Map
              </button>

              <button
                type="button"
                onClick={locateMe}
                disabled={locating}
                className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white py-2 rounded-md text-sm font-medium"
              >
                {locating
                  ? 'Locating...'
                  : '📌 Locate Me'}
              </button>

            </div>

            {/* SELECTED LOCATION */}
            {form.latitude && form.longitude && (
              <div className="mt-2 bg-green-50 border border-green-200 rounded-md p-2">

                <p className="text-xs text-green-700 font-medium">
                  ✓ Location selected
                </p>

                <p className="text-[11px] text-gray-500 mt-1">
                  Latitude: {form.latitude}
                </p>

                <p className="text-[11px] text-gray-500">
                  Longitude: {form.longitude}
                </p>

              </div>
            )}
          </div>

          {/* MAP */}
          {showMap && (
            <div className="border border-gray-300 rounded-lg overflow-hidden">

              {/* MAP HEADER */}
              <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-b">

                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Select your location
                  </p>

                  <p className="text-xs text-gray-500">
                    Click anywhere on the map
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMap(false)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Close
                </button>

              </div>

              {/* MAP */}
              <MapContainer
                center={
                  form.latitude && form.longitude
                    ? [
                      Number(form.latitude),
                      Number(form.longitude)
                    ]
                    : DEFAULT_LOCATION
                }
                zoom={13}
                scrollWheelZoom={true}
                style={{
                  height: '320px',
                  width: '100%'
                }}
              >

                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapClickHandler
                  onSelect={selectLocation}
                />

                <MapMover
                  latitude={form.latitude}
                  longitude={form.longitude}
                />

                {/* Selected marker */}
                {form.latitude && form.longitude && (
                  <>
                    <Marker
                      position={[
                        Number(form.latitude),
                        Number(form.longitude)
                      ]}
                    />

                    <CircleMarker
                      center={[
                        Number(form.latitude),
                        Number(form.longitude)
                      ]}
                      radius={8}
                    />
                  </>
                )}

              </MapContainer>

              {/* MAP FOOTER */}
              <div className="bg-white px-3 py-2">

                {gettingAddress ? (
                  <p className="text-xs text-gray-500">
                    Finding address...
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Click on your exact location. The address will be filled automatically.
                  </p>
                )}

              </div>

            </div>
          )}

          {/* PASSWORD */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Password
            </label>

            <input
              name="password"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={handleChange}
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Minimum 6 characters"
            />
          </div>

          {/* ERROR */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">
                {error}
              </p>
            </div>
          )}

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-md text-sm"
          >
            {busy
              ? 'Creating account…'
              : 'Create Account'}
          </button>

        </form>

      </div>
      <div className=''>
        {/* LOGIN */}
        <p className="text-sm text-gray-500 mt-4 text-center">
          Already have an account?{' '}

          <Link
            to="/login"
            className="text-brand-700 font-medium"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}