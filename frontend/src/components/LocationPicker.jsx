import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { OSM_TILE_URL, OSM_ATTRIBUTION, NOMINATIM_URL, DEFAULT_MAP_CENTER, INDIA_REGION_BIAS } from '../config/maps';

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:#2fa257;border:2px solid #fff;
    transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

/**
 * Lets the user click on a map (or search an address via Nominatim) to
 * pick lat/lng. Calls onChange({ lat, lng, address }) whenever the
 * selection changes. Uses OpenStreetMap tiles and the free Nominatim
 * geocoding API — no API key required.
 */
export default function LocationPicker({ onChange, initialAddress = '' }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const searchDebounce = useRef(null);

  const [address, setAddress] = useState(initialAddress);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const placeMarker = useCallback((lat, lng, skipReverseGeocode = false, presetAddress = null) => {
    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(mapInstance.current);
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current.getLatLng();
        placeMarker(pos.lat, pos.lng);
      });
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
    mapInstance.current.panTo([lat, lng]);

    if (presetAddress) {
      setAddress(presetAddress);
      onChange({ lat, lng, address: presetAddress });
      return;
    }
    if (skipReverseGeocode) {
      onChange({ lat, lng, address });
      return;
    }

    // Reverse geocode via Nominatim to fill in a human-readable address.
    fetch(`${NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then((r) => r.json())
      .then((data) => {
        const formatted = data?.display_name || address;
        setAddress(formatted);
        onChange({ lat, lng, address: formatted });
      })
      .catch(() => {
        onChange({ lat, lng, address });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, onChange]);

  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;

    mapInstance.current = L.map(mapRef.current).setView([DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng], 5);

    L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(mapInstance.current);

    mapInstance.current.on('click', (e) => {
      placeMarker(e.latlng.lat, e.latlng.lng);
    });

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSearchInput(value) {
    setAddress(value);
    clearTimeout(searchDebounce.current);

    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    // Debounced to respect Nominatim's public usage policy (~1 req/sec).
    searchDebounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `${NOMINATIM_URL}/search?format=json&countrycodes=${INDIA_REGION_BIAS}&limit=5&q=${encodeURIComponent(value)}`
        );
        const data = await res.json();
        setSuggestions(data || []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  }

  function selectSuggestion(s) {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    setSuggestions([]);
    mapInstance.current.setView([lat, lng], 16);
    placeMarker(lat, lng, false, s.display_name);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
     setLocationError('Your browser does not support location access.');
     return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
     (pos) => {
        const { latitude, longitude } = pos.coords;
        mapInstance.current.setView([latitude, longitude], 16);
        placeMarker(latitude, longitude);
       setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
        setLocationError('Location permission denied. Enable it in your browser/phone settings and try again.');
        } else if (err.code === err.TIMEOUT) {
          setLocationError('Location request timed out. Try again, ideally outdoors with GPS on.');
        } else {
          setLocationError('Could not get your location. Make sure GPS/Location is turned on.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative flex gap-2">
        <input
          value={address}
          onChange={(e) => onSearchInput(e.target.value)}
          placeholder="Search an address in India…"
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <button type="button" onClick={useMyLocation} disabled={locating}
          className="px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 whitespace-nowrap">
          {locating ? 'Locating…' : 'Use my location'}
        </button>

        {suggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-24 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[1000] max-h-56 overflow-y-auto">
            {suggestions.map((s) => (
              <li key={s.place_id}>
                <button
                  type="button"
                  onClick={() => selectSuggestion(s)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  {s.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {searching && <p className="text-xs text-gray-400">Searching…</p>}
      {locationError && <p className="text-xs text-red-600">{locationError}</p>}
      <div ref={mapRef} className="w-full h-64 rounded-lg border border-gray-200" />
      <p className="text-xs text-gray-500">Click on the map or drag the pin to set the exact pickup point.</p>
    </div>
  );
}
