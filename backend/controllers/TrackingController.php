<?php

require_once __DIR__ . '/../models/Vehicle.php';
require_once __DIR__ . '/../models/VehicleAssignment.php';
require_once __DIR__ . '/../models/VehicleLocation.php';
require_once __DIR__ . '/../models/Notification.php';
require_once __DIR__ . '/../models/Donation.php';
require_once __DIR__ . '/../utils/Geo.php';
require_once __DIR__ . '/../utils/Response.php';

class TrackingController
{
    private PDO $db;
    private array $config;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->config = require __DIR__ . '/../config/app.php';
    }

    /**
     * Receives a real GPS fix from the driver's browser
     * (navigator.geolocation.watchPosition -> POST every ~3-5s).
     */
    public function updateLocation(array $auth): void
    {
        RoleMiddleware::require($auth, ['DRIVER']);

        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        foreach (['vehicle_id', 'latitude', 'longitude'] as $f) {
            if (!isset($body[$f]) || $body[$f] === '') {
                Response::error("Field '{$f}' is required.", 422);
            }
        }

        if (!Geo::isValidLatitude($body['latitude']) || !Geo::isValidLongitude($body['longitude'])) {
            Response::error('Invalid GPS coordinates received.', 422);
        }

        $vehicleModel = new Vehicle($this->db);
        $vehicle = $vehicleModel->find((int) $body['vehicle_id']);

        if (!$vehicle) {
            Response::error('Vehicle not found.', 404);
        }

        // CRITICAL: never trust vehicle_id from the client blindly — verify
        // the authenticated driver actually owns this vehicle.
        if ((int) $vehicle['driver_id'] !== (int) $auth['sub']) {
            Response::error('You are not assigned to this vehicle.', 403);
        }

        $assignmentModel = new VehicleAssignment($this->db);
        $assignment = $assignmentModel->findActiveByVehicle((int) $vehicle['id']);

        if (!$assignment) {
            Response::error('No active trip assignment for this vehicle. Start a trip first.', 409);
        }

        $lat = (float) $body['latitude'];
        $lon = (float) $body['longitude'];
        $accuracy = isset($body['accuracy']) ? (float) $body['accuracy'] : null;
        $speed = isset($body['speed']) ? (float) $body['speed'] : null;
        $heading = isset($body['heading']) ? (float) $body['heading'] : null;

        // 1) Update the vehicle's latest known position.
        $vehicleModel->updateLocation((int) $vehicle['id'], $lat, $lon, $accuracy, $speed, $heading);

        // 2) Append to the permanent GPS history log.
        $locationModel = new VehicleLocation($this->db);
        $locationModel->insert([
            'vehicle_id'    => $vehicle['id'],
            'assignment_id' => $assignment['id'],
            'latitude'      => $lat,
            'longitude'     => $lon,
            'accuracy'      => $accuracy,
            'speed'         => $speed,
            'heading'       => $heading,
        ]);

        // 3) Automatic arrival detection based on real GPS distance.
        $this->checkArrival($assignment, $lat, $lon);

        Response::success([
            'vehicle_id'    => $vehicle['id'],
            'assignment_id' => $assignment['id'],
            'latitude'      => $lat,
            'longitude'     => $lon,
            'recorded_at'   => date('c'),
        ], 'Location updated.');
    }

    /** GET /api/tracking/vehicle/{id} — latest known position + status. */
    public function vehicle(array $auth, int $vehicleId): void
    {
        $vehicleModel = new Vehicle($this->db);
        $vehicle = $vehicleModel->find($vehicleId);

        if (!$vehicle) {
            Response::error('Vehicle not found.', 404);
        }

        $assignment = (new VehicleAssignment($this->db))->findActiveByVehicle($vehicleId);

        Response::success([
            'vehicle'    => $vehicle,
            'assignment' => $assignment,
            'gps_stale'  => $this->isStale($vehicle['last_updated']),
        ]);
    }

    /** GET /api/tracking/assignment/{id} — everything the tracking page needs in one call. */
    public function assignment(array $auth, int $assignmentId): void
    {
        $assignment = (new VehicleAssignment($this->db))->find($assignmentId);

        if (!$assignment) {
            Response::error('Assignment not found.', 404);
        }

        Response::success([
            'assignment'      => $assignment,
            'gps_stale'       => $this->isStale($assignment['last_updated']),
            'has_gps_fix'     => $assignment['vehicle_latitude'] !== null && $assignment['vehicle_longitude'] !== null,
            'arrival_radius_m'=> $this->config['arrival_radius_meters'],
        ]);
    }

    /** GET /api/tracking/history/{assignmentId} — full GPS trail for map polyline / trip replay. */
    public function history(array $auth, int $assignmentId): void
    {
        $history = (new VehicleLocation($this->db))->historyForAssignment($assignmentId);
        Response::success($history);
    }

    private function isStale(?string $lastUpdated): bool
    {
        if (!$lastUpdated) {
            return true;
        }
        return (time() - strtotime($lastUpdated)) > 30; // no fix in 30s => considered stale/delayed
    }

    private function checkArrival(array $assignment, float $lat, float $lon): void
    {
        $radius = (float) $this->config['arrival_radius_meters'];
        $assignmentModel = new VehicleAssignment($this->db);
        $vehicleModel = new Vehicle($this->db);
        $donationModel = new Donation($this->db);
        $notif = new Notification($this->db);

        if (in_array($assignment['status'], ['On the Way'], true)) {
            $distance = Geo::distanceMeters($lat, $lon, (float) $assignment['pickup_latitude'], (float) $assignment['pickup_longitude']);
            if ($distance <= $radius) {
                $assignmentModel->updateStatus((int) $assignment['id'], 'Arrived at Pickup', 'pickup_arrived_at');
                $vehicleModel->updateStatus((int) $assignment['vehicle_id'], 'Arrived at Pickup');
                $donationModel->updateStatus((int) $assignment['donation_id'], 'Arrived at Pickup');
                $donorId = $this->donorIdForDonation((int) $assignment['donation_id']);
                $notif->create($donorId, 'Vehicle has arrived', 'Vehicle has reached the pickup location.', 'ARRIVED_PICKUP');
            }
        } elseif (in_array($assignment['status'], ['Delivering'], true)) {
            $distance = Geo::distanceMeters($lat, $lon, (float) $assignment['destination_latitude'], (float) $assignment['destination_longitude']);
            if ($distance <= $radius) {
                $assignmentModel->updateStatus((int) $assignment['id'], 'Arrived at NGO', 'destination_arrived_at');
                $vehicleModel->updateStatus((int) $assignment['vehicle_id'], 'Arrived at NGO');
                $donationModel->updateStatus((int) $assignment['donation_id'], 'Arrived at NGO');

                $stmt = $this->db->prepare('SELECT ngo_id FROM food_requests WHERE id = ?');
                $stmt->execute([$assignment['request_id']]);
                $ngoId = (int) $stmt->fetchColumn();
                if ($ngoId) {
                    $notif->create($ngoId, 'Vehicle has arrived', 'Vehicle has reached the NGO location.', 'ARRIVED_NGO');
                }
            }
        }
    }

    private function donorIdForDonation(int $donationId): int
    {
        $stmt = $this->db->prepare('SELECT donor_id FROM donations WHERE id = ?');
        $stmt->execute([$donationId]);
        return (int) $stmt->fetchColumn();
    }
}
