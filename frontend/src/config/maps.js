// Leaflet + OpenStreetMap configuration. No API key required.
//
// Tile layer: OpenStreetMap standard tiles (fine for development/demo
// traffic). For production at real scale, consider a paid tile provider
// (MapTiler, Stadia Maps, Thunderforest, etc.) or self-hosting tiles —
// the public OSM tile servers ask that you not hammer them with heavy
// production traffic. Swap OSM_TILE_URL below if you switch providers.
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// OSRM (Open Source Routing Machine) public demo router — gives real
// road-network routes, distance, and duration. The public demo server is
// rate-limited and NOT meant for production load; self-host your own OSRM
// instance (with an India OSM extract) for production use, and point this
// at your own server via VITE_OSRM_SERVICE_URL.
export const OSRM_SERVICE_URL = import.meta.env.VITE_OSRM_SERVICE_URL || 'https://router.project-osrm.org/route/v1';

// Nominatim (OpenStreetMap) geocoding — used for the pickup-address search
// box and reverse geocoding when a pin is dropped/dragged. Nominatim's
// usage policy caps public-server usage at ~1 request/second; the search
// box in LocationPicker is debounced to respect that. For production
// traffic, proxy Nominatim requests through your own backend or use a
// paid geocoding provider.
export const NOMINATIM_URL = import.meta.env.VITE_NOMINATIM_URL || 'https://nominatim.openstreetmap.org';

export const DEFAULT_MAP_CENTER = { lat: 22.9734, lng: 78.6569 }; // India centroid
export const DEFAULT_MAP_ZOOM = 5;
export const INDIA_REGION_BIAS = 'in'; // Nominatim countrycodes value
