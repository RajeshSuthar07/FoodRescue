import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { OSM_TILE_URL, OSM_ATTRIBUTION, OSRM_SERVICE_URL } from '../config/maps';

function circleIcon(letter, color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${color};border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;
      color:#fff;font-weight:700;font-size:12px;">${letter}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

const vehicleIcon = L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;border-radius:50%;background:#1447e6;border:3px solid #fff;
    box-shadow:0 1px 5px rgba(0,0,0,.5);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/**
 * Renders a live Leaflet/OpenStreetMap view showing:
 *  - pickup marker (donor location)
 *  - destination marker (NGO location)
 *  - vehicle marker at its REAL current GPS position
 *  - the actual road route + distance + ETA via the OSRM routing service
 *
 * Props:
 *  pickup: {lat, lng}
 *  destination: {lat, lng}
 *  vehiclePosition: {lat, lng} | null   (null => no GPS fix yet)
 *  vehicleLabel: string
 *  onRouteInfo: ({distanceText, durationText, distanceMeters, durationSeconds}) => void
 */
export default function LiveTrackingMap({ pickup, destination, vehiclePosition, vehicleLabel, onRouteInfo }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const vehicleMarkerRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const routerRef = useRef(null);
  const lastRouteOrigin = useRef(null);

  const [mapError, setMapError] = useState(null);

  // Initialise the map once.
  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;

    const center = vehiclePosition || pickup || destination || { lat: 22.9734, lng: 78.6569 };

    mapInstance.current = L.map(mapRef.current, {
      zoomControl: true,
    }).setView([center.lat, center.lng], 13);

    L.tileLayer(OSM_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(mapInstance.current);

    routerRef.current = L.Routing.osrmv1({ serviceUrl: OSRM_SERVICE_URL });

    if (pickup) {
      pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng], { icon: circleIcon('P', '#2fa257') })
        .addTo(mapInstance.current)
        .bindPopup('Pickup location (Donor)');
    }
    if (destination) {
      destMarkerRef.current = L.marker([destination.lat, destination.lng], { icon: circleIcon('N', '#d5691f') })
        .addTo(mapInstance.current)
        .bindPopup('NGO destination');
    }

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update/create the vehicle marker whenever a new REAL GPS fix arrives.
  useEffect(() => {
    if (!mapInstance.current || !vehiclePosition) return;

    if (!vehicleMarkerRef.current) {
      vehicleMarkerRef.current = L.marker([vehiclePosition.lat, vehiclePosition.lng], { icon: vehicleIcon })
        .addTo(mapInstance.current)
        .bindPopup(vehicleLabel || 'FoodRescue Vehicle');
    } else {
      vehicleMarkerRef.current.setLatLng([vehiclePosition.lat, vehiclePosition.lng]);
    }
  }, [vehiclePosition, vehicleLabel]);

  // Recalculate the real road route (via OSRM) whenever the vehicle moves
  // meaningfully or the active destination leg changes (pickup -> NGO).
  useEffect(() => {
    if (!mapInstance.current || !vehiclePosition || !destination || !routerRef.current) return;

    const originKey = `${vehiclePosition.lat.toFixed(5)},${vehiclePosition.lng.toFixed(5)}|${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`;
    if (lastRouteOrigin.current === originKey) return; // avoid redundant calls
    lastRouteOrigin.current = originKey;

    const waypoints = [
      L.Routing.waypoint(L.latLng(vehiclePosition.lat, vehiclePosition.lng)),
      L.Routing.waypoint(L.latLng(destination.lat, destination.lng)),
    ];

    routerRef.current.route(waypoints, (err, routes) => {
      if (err || !routes || !routes.length) {
        setMapError('Could not calculate route from the routing service.');
        return;
      }
      setMapError(null);

      const route = routes[0];

      if (routeLineRef.current) {
        mapInstance.current.removeLayer(routeLineRef.current);
      }
      routeLineRef.current = L.polyline(route.coordinates, { color: '#1f8345', weight: 5 }).addTo(mapInstance.current);

      const distanceMeters = route.summary.totalDistance;
      const durationSeconds = route.summary.totalTime;

      onRouteInfo?.({
        distanceText: distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(1)} km` : `${Math.round(distanceMeters)} m`,
        durationText: durationSeconds >= 60 ? `${Math.round(durationSeconds / 60)} min` : `${Math.round(durationSeconds)} sec`,
        distanceMeters,
        durationSeconds,
      });
    });
  }, [vehiclePosition, destination, onRouteInfo]);

  return (
    <div className="relative w-full h-full min-h-[320px] rounded-lg overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />
      {mapError && (
        <div className="absolute bottom-2 left-2 right-2 bg-amber-50 text-amber-800 text-xs px-3 py-2 rounded z-[1000]">
          {mapError}
        </div>
      )}
    </div>
  );
}
