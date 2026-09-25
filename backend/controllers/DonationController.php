<?php

require_once __DIR__ . '/../models/Donation.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Notification.php';
require_once __DIR__ . '/../utils/Geo.php';
require_once __DIR__ . '/../utils/Response.php';

class DonationController
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function index(array $auth): void
    {
        $donationModel = new Donation($this->db);

        if ($auth['role'] === 'DONOR') {
            Response::success($donationModel->byDonor((int) $auth['sub']));
            return;
        }

        if ($auth['role'] === 'ADMIN') {
            Response::success($donationModel->all());
            return;
        }

        // NGO / DRIVER see the available feed.
        Response::success($donationModel->allAvailable());
    }

    public function show(array $auth, int $id): void
    {
        $donationModel = new Donation($this->db);
        $donation = $donationModel->find($id);

        if (!$donation) {
            Response::error('Donation not found.', 404);
        }

        // Attach the latest related trip assignment id (if any) so the
        // frontend can deep-link straight to the live tracking page.
        $stmt = $this->db->prepare(
            'SELECT id FROM vehicle_assignments WHERE donation_id = ? ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute([$id]);
        $donation['assignment_id'] = $stmt->fetchColumn() ?: null;

        // Latest approved (not yet vehicle-assigned) request id, used by the
        // Admin "Assign Vehicle" screen.
        $stmt2 = $this->db->prepare(
            "SELECT id FROM food_requests WHERE donation_id = ? AND status = 'Approved' ORDER BY id DESC LIMIT 1"
        );
        $stmt2->execute([$id]);
        $donation['approved_request_id'] = $stmt2->fetchColumn() ?: null;

        Response::success($donation);
    }

    public function store(array $auth): void
    {
        RoleMiddleware::require($auth, ['DONOR']);

        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $required = ['food_name', 'food_type', 'quantity', 'expiry_date', 'pickup_address', 'pickup_latitude', 'pickup_longitude'];
        foreach ($required as $field) {
            if (!isset($body[$field]) || $body[$field] === '') {
                Response::error("Field '{$field}' is required.", 422);
            }
        }

        if (!Geo::isValidLatitude($body['pickup_latitude']) || !Geo::isValidLongitude($body['pickup_longitude'])) {
            Response::error('Invalid pickup coordinates.', 422);
        }

        $donationModel = new Donation($this->db);
        $id = $donationModel->create([
            'donor_id'         => $auth['sub'],
            'food_name'        => $body['food_name'],
            'food_type'        => $body['food_type'],
            'quantity'         => $body['quantity'],
            'description'      => $body['description'] ?? null,
            'expiry_date'      => $body['expiry_date'],
            'pickup_address'   => $body['pickup_address'],
            'pickup_latitude'  => $body['pickup_latitude'],
            'pickup_longitude' => $body['pickup_longitude'],
        ]);

        // Notify all active NGOs that a new donation is available.
        $userModel = new User($this->db);
        $notificationModel = new Notification($this->db);
        foreach ($userModel->findNearbyNGOs((float) $body['pickup_latitude'], (float) $body['pickup_longitude']) as $ngo) {
            $notificationModel->create(
                $ngo['id'],
                'New food donation nearby',
                "{$body['food_name']} ({$body['quantity']}) is now available for pickup.",
                'NEW_DONATION'
            );
        }

        Response::success($donationModel->find($id), 'Donation created.', 201);
    }

    public function update(array $auth, int $id): void
    {
        $donationModel = new Donation($this->db);
        $donation = $donationModel->find($id);

        if (!$donation) {
            Response::error('Donation not found.', 404);
        }
        if ($auth['role'] !== 'ADMIN' && (int) $donation['donor_id'] !== (int) $auth['sub']) {
            Response::error('You cannot edit this donation.', 403);
        }

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $allowed = ['food_name', 'food_type', 'quantity', 'description', 'expiry_date', 'pickup_address', 'pickup_latitude', 'pickup_longitude', 'status'];

        $fields = [];
        $params = ['id' => $id];
        foreach ($allowed as $f) {
            if (isset($body[$f])) {
                $fields[] = "$f = :$f";
                $params[$f] = $body[$f];
            }
        }

        if ($fields) {
            $sql = 'UPDATE donations SET ' . implode(', ', $fields) . ' WHERE id = :id';
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
        }

        Response::success($donationModel->find($id), 'Donation updated.');
    }

    public function destroy(array $auth, int $id): void
    {
        $donationModel = new Donation($this->db);
        $donation = $donationModel->find($id);

        if (!$donation) {
            Response::error('Donation not found.', 404);
        }
        if ($auth['role'] !== 'ADMIN' && (int) $donation['donor_id'] !== (int) $auth['sub']) {
            Response::error('You cannot delete this donation.', 403);
        }

        $donationModel->delete($id);
        Response::success(null, 'Donation deleted.');
    }
}
