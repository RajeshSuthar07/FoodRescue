import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import useTrackingPoll from '../hooks/useTrackingPoll';
import LiveTrackingMap from '../components/LiveTrackingMap';
import StatusBadge from '../components/StatusBadge';

function timeAgoLabel(seconds) {
  if (seconds == null) return '—';
  if (seconds < 3) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  return `${Math.floor(seconds / 60)} min ago`;
}

export default function TrackingPage() {
  const { assignmentId } = useParams();
  const { data, error, secondsAgo } = useTrackingPoll(assignmentId);
  const [routeInfo, setRouteInfo] = useState(null); // real OSRM-calculated distance/ETA

  const assignment = data?.assignment;

  const vehiclePosition = useMemo(() => {
    if (!assignment?.vehicle_latitude || !assignment?.vehicle_longitude) return null;
    return { lat: parseFloat(assignment.vehicle_latitude), lng: parseFloat(assignment.vehicle_longitude) };
  }, [assignment]);

  const pickup = assignment
    ? { lat: parseFloat(assignment.pickup_latitude), lng: parseFloat(assignment.pickup_longitude) }
    : null;
  const destination = assignment
    ? { lat: parseFloat(assignment.destination_latitude), lng: parseFloat(assignment.destination_longitude) }
    : null;

  // Which leg is "active" determines the destination shown for routing.
  const activeDestination =
    assignment && ['Assigned', 'On the Way', 'Arrived at Pickup'].includes(assignment.status)
      ? pickup
      : destination;

  const gpsConnected = !!vehiclePosition && !data?.gps_stale;
  const noFixYet = !data?.has_gps_fix;

  let gpsStatusLine = 'Waiting for driver GPS…';
  if (noFixYet) {
    gpsStatusLine = 'Waiting for driver GPS…';
  } else if (data?.gps_stale) {
    gpsStatusLine = 'GPS connection delayed';
  } else {
    gpsStatusLine = 'Connected';
  }

  if (error) {
    return <div className="max-w-3xl mx-auto p-6 text-red-600">{error}</div>;
  }
  if (!assignment) {
    return <div className="max-w-3xl mx-auto p-6 text-gray-500">Loading trip…</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            FoodRescue Vehicle {assignment.vehicle_number}
          </h1>
          <p className="text-sm text-gray-500">{assignment.food_name}</p>
        </div>
        <div className="flex items-center gap-2">
          {gpsConnected && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" /> LIVE
            </span>
          )}
          <StatusBadge status={assignment.status} />
        </div>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-4">
        {/* Left: trip info */}
        <div className="space-y-4 order-2 lg:order-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            <Row label="Driver" value={assignment.driver_name || '—'} />
            <Row label="Vehicle" value={assignment.vehicle_number} />
            <Row label="Pickup address" value={assignment.pickup_address} />
            <Row
              label="ETA"
              value={routeInfo?.durationText || (noFixYet ? 'Vehicle location unavailable' : 'Calculating…')}
            />
            <Row
              label="Distance remaining"
              value={routeInfo?.distanceText || (noFixYet ? '—' : 'Calculating…')}
            />
            <Row
              label="Last updated"
              value={noFixYet ? 'No GPS data yet' : timeAgoLabel(secondsAgo)}
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">GPS Information</h3>
            <Row label="GPS" value={gpsStatusLine} highlight={!gpsConnected} />
            <Row label="Accuracy" value={assignment.accuracy != null ? `${Number(assignment.accuracy).toFixed(0)} m` : '—'} />
            <Row label="Speed" value={assignment.speed != null ? `${Number(assignment.speed).toFixed(0)} km/h` : '—'} />
            <Row
              label="Last GPS update"
              value={assignment.last_updated ? new Date(assignment.last_updated.replace(' ', 'T') + 'Z').toLocaleTimeString() : '—'}
            />
          </div>
        </div>

        {/* Right: map */}
        <div className="order-1 lg:order-2 h-[420px] lg:h-[560px]">
          {noFixYet ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl text-gray-500 text-sm">
              Waiting for driver GPS… the map will appear once the driver starts the trip and shares location.
            </div>
          ) : (
            <LiveTrackingMap
              pickup={pickup}
              destination={activeDestination}
              vehiclePosition={vehiclePosition}
              vehicleLabel={`${assignment.vehicle_number} · ${assignment.driver_name || ''}`}
              onRouteInfo={setRouteInfo}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${highlight ? 'text-amber-600' : 'text-gray-800'}`}>{value}</span>
    </div>
  );
}
