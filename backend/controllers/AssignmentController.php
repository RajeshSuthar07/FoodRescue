<?php

require_once __DIR__ . '/../models/VehicleAssignment.php';
require_once __DIR__ . '/../models/Vehicle.php';
require_once __DIR__ . '/../models/Donation.php';
require_once __DIR__ . '/../models/FoodRequestModel.php';
require_once __DIR__ . '/../models/Notification.php';
require_once __DIR__ . '/../utils/Response.php';

class AssignmentController
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /** ADMIN assigns a vehicle + driver to an approved request. */
    public function store(array $auth): void
    {
        RoleMiddleware::require($auth, ['ADMIN']);

        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        foreach (['vehicle_id', 'request_id'] as $f) {
            if (empty($body[$f])) {
                Response::error("Field '{$f}' is required.", 422);
            }
        }

        // Check request
        $requestModel = new FoodRequestModel($this->db);
        $request = $requestModel->find((int) $body['request_id']);

        if (!$request || $request['status'] !== 'Approved') {
            Response::error(
                'Request must be approved before assigning a vehicle.',
                409
            );
        }

        // Get donation
        $donationModel = new Donation($this->db);
        $donation = $donationModel->find((int) $request['donation_id']);

        if (!$donation) {
            Response::error('Donation not found.', 404);
        }

        // Get vehicle
        $vehicleModel = new Vehicle($this->db);
        $vehicle = $vehicleModel->find((int) $body['vehicle_id']);

        if (!$vehicle) {
            Response::error('Vehicle not found.', 404);
        }

        // Vehicle must have a driver
        if (empty($vehicle['driver_id'])) {
            Response::error(
                'This vehicle has no driver assigned. Assign a driver first.',
                422
            );
        }

        // IMPORTANT:
        // Do not allow a vehicle which is already handling another delivery.
        // Once the previous delivery is completed, deliver() changes the
        // vehicle status back to Available.
        if ($vehicle['status'] !== 'Available') {
            Response::error(
                'This vehicle is currently busy with another delivery.',
                409
            );
        }

        // NGO destination = requesting NGO's registered coordinates
        $stmt = $this->db->prepare(
            'SELECT latitude, longitude FROM users WHERE id = ?'
        );
        $stmt->execute([$request['ngo_id']]);
        $ngo = $stmt->fetch();

        // Create assignment
        $assignmentModel = new VehicleAssignment($this->db);

        $assignmentId = $assignmentModel->create([
            'vehicle_id'            => $vehicle['id'],
            'driver_id'             => $vehicle['driver_id'],
            'donation_id'           => $donation['id'],
            'request_id'            => $request['id'],
            'pickup_latitude'       => $donation['pickup_latitude'],
            'pickup_longitude'      => $donation['pickup_longitude'],
            'destination_latitude'  => $ngo['latitude'] ?? $donation['pickup_latitude'],
            'destination_longitude' => $ngo['longitude'] ?? $donation['pickup_longitude'],
        ]);

        // Vehicle is now busy
        $vehicleModel->updateStatus(
            (int) $vehicle['id'],
            'Assigned'
        );

        // Update donation
        $donationModel->updateStatus(
            (int) $donation['id'],
            'Vehicle Assigned'
        );

        // Notifications
        $notif = new Notification($this->db);

        $notif->create(
            (int) $vehicle['driver_id'],
            'New trip assigned',
            "You have been assigned to pick up {$donation['food_name']}.",
            'TRIP_ASSIGNED'
        );

        $notif->create(
            (int) $donation['donor_id'],
            'Vehicle assigned',
            "Vehicle {$vehicle['vehicle_number']} has been assigned to your donation.",
            'VEHICLE_ASSIGNED'
        );

        $notif->create(
            (int) $request['ngo_id'],
            'Vehicle assigned',
            "Vehicle {$vehicle['vehicle_number']} has been assigned for your requested donation.",
            'VEHICLE_ASSIGNED'
        );

        Response::success(
            $assignmentModel->find($assignmentId),
            'Vehicle assigned.',
            201
        );
    }

    /** Show assignment */
    public function show(array $auth, int $id): void
    {
        $assignment = (new VehicleAssignment($this->db))->find($id);

        if (!$assignment) {
            Response::error('Assignment not found.', 404);
        }

        Response::success($assignment);
    }

    /** DRIVER starts the trip (pickup leg). */
    public function start(array $auth, int $id): void
    {
        RoleMiddleware::require($auth, ['DRIVER']);

        $assignment = $this->assertOwnedByDriver(
            $id,
            (int) $auth['sub']
        );

        if ($assignment['status'] !== 'Assigned') {
            Response::error(
                'Trip already started or not in a startable state.',
                409
            );
        }

        $assignmentModel = new VehicleAssignment($this->db);

        $assignmentModel->updateStatus(
            $id,
            'On the Way',
            'started_at'
        );

        $vehicleModel = new Vehicle($this->db);

        $vehicleModel->updateStatus(
            (int) $assignment['vehicle_id'],
            'On the Way'
        );

        (new Donation($this->db))->updateStatus(
            (int) $assignment['donation_id'],
            'Pickup in Progress'
        );

        Response::success(
            $assignmentModel->find($id),
            'Trip started. Live GPS tracking is now active.'
        );
    }

    /** DRIVER confirms pickup at the donor location. */
    public function pickup(array $auth, int $id): void
    {
        RoleMiddleware::require($auth, ['DRIVER']);

        $assignment = $this->assertOwnedByDriver(
            $id,
            (int) $auth['sub']
        );

        if (!in_array(
            $assignment['status'],
            ['On the Way', 'Arrived at Pickup'],
            true
        )) {
            Response::error(
                'Vehicle must be on the way to or arrived at pickup before confirming pickup.',
                409
            );
        }

        $assignmentModel = new VehicleAssignment($this->db);

        $assignmentModel->updateStatus(
            $id,
            'Food Picked Up',
            'picked_up_at'
        );

        // Move directly into delivery
        $assignmentModel->updateStatus(
            $id,
            'Delivering'
        );

        $stmt = $this->db->prepare(
            'UPDATE vehicle_assignments
             SET delivery_started_at = NOW()
             WHERE id = ?'
        );
        $stmt->execute([$id]);

        $vehicleModel = new Vehicle($this->db);

        $vehicleModel->updateStatus(
            (int) $assignment['vehicle_id'],
            'Delivering'
        );

        $donationModel = new Donation($this->db);

        $donationModel->updateStatus(
            (int) $assignment['donation_id'],
            'Delivering'
        );

        (new Notification($this->db))->create(
            $this->donorIdForAssignment($assignment),
            'Food picked up',
            'The driver has picked up the food and is now heading to the NGO.',
            'FOOD_PICKED_UP'
        );

        Response::success(
            $assignmentModel->find($id),
            'Pickup confirmed. Heading to NGO.'
        );
    }

    /** DRIVER confirms delivery at the NGO location. */
    public function deliver(array $auth, int $id): void
    {
        RoleMiddleware::require($auth, ['DRIVER']);

        $assignment = $this->assertOwnedByDriver(
            $id,
            (int) $auth['sub']
        );

        if (!in_array(
            $assignment['status'],
            ['Delivering', 'Arrived at NGO'],
            true
        )) {
            Response::error(
                'Vehicle must be delivering or arrived at NGO before confirming delivery.',
                409
            );
        }

        $assignmentModel = new VehicleAssignment($this->db);

        // Complete assignment
        $assignmentModel->updateStatus(
            $id,
            'Delivered',
            'delivered_at'
        );

        $assignmentModel->updateStatus(
            $id,
            'Completed',
            'completed_at'
        );

        /*
         * IMPORTANT:
         * Delivery is completed, so the vehicle becomes available again.
         *
         * This allows the SAME DRIVER/VEHICLE to be assigned
         * to another delivery later.
         */
        $vehicleModel = new Vehicle($this->db);

        $vehicleModel->updateStatus(
            (int) $assignment['vehicle_id'],
            'Available'
        );

        // Mark donation completed
        $donationModel = new Donation($this->db);

        $donationModel->updateStatus(
            (int) $assignment['donation_id'],
            'Completed'
        );

        // Notify donor
        $notif = new Notification($this->db);

        $notif->create(
            $this->donorIdForAssignment($assignment),
            'Donation completed',
            'Your donation has been delivered successfully. Thank you!',
            'DONATION_COMPLETED'
        );

        Response::success(
            $assignmentModel->find($id),
            'Delivery confirmed. Donation completed.'
        );
    }

    /**
     * Make sure the assignment belongs to the logged-in driver.
     */
    private function assertOwnedByDriver(
        int $assignmentId,
        int $driverId
    ): array {
        $assignment = (new VehicleAssignment($this->db))
            ->find($assignmentId);

        if (!$assignment) {
            Response::error(
                'Assignment not found.',
                404
            );
        }

        if ((int) $assignment['driver_id'] !== $driverId) {
            Response::error(
                'This trip is not assigned to you.',
                403
            );
        }

        return $assignment;
    }

    /**
     * Get donor ID for an assignment.
     */
    private function donorIdForAssignment(
        array $assignment
    ): int {
        $stmt = $this->db->prepare(
            'SELECT donor_id FROM donations WHERE id = ?'
        );

        $stmt->execute([
            $assignment['donation_id']
        ]);

        return (int) $stmt->fetchColumn();
    }
}