<?php

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/Geo.php';

class UserController
{
    private PDO $db;
    private User $userModel;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->userModel = new User($db);
    }

    /**
     * GET /users/drivers
     * Admin only — lists every driver (any status) so the admin screen can
     * show Pending / Active / Rejected drivers together.
     */
    public function drivers(array $auth): void
    {
        if (($auth['role'] ?? '') !== 'ADMIN') {
            Response::error('Admin access required.', 403);
        }

        $drivers = $this->userModel->all('DRIVER');

        Response::success([
            'drivers' => $drivers,
        ], 'Drivers fetched successfully.');
    }

    /**
     * PUT /users/drivers/{id}/approve
     * Admin only — moves a PENDING driver to ACTIVE and makes their
     * vehicle assignable again.
     */
    public function approveDriver(array $auth, int $id): void
    {
        $this->setDriverStatus($auth, $id, 'ACTIVE');
    }

    /**
     * PUT /users/drivers/{id}/reject
     * Admin only — moves a PENDING driver to REJECTED. The driver cannot
     * log in; their vehicle stays Offline.
     */
    public function rejectDriver(array $auth, int $id): void
    {
        $this->setDriverStatus($auth, $id, 'REJECTED');
    }

    /**
     * PUT /users/drivers/{id}/status
     * Admin only — general-purpose status change (e.g. suspending an
     * already-active driver), kept for flexibility beyond the simple
     * approve/reject pair above.
     */
    public function updateDriverStatus(array $auth, int $id): void
    {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $status = strtoupper(trim($body['status'] ?? ''));

        $allowed = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'REJECTED', 'PENDING'];

        if (!in_array($status, $allowed, true)) {
            Response::error(
                'Invalid status. Use PENDING, ACTIVE, INACTIVE, SUSPENDED or REJECTED.',
                422
            );
        }

        $this->setDriverStatus($auth, $id, $status);
    }

    /**
     * PUT /auth/profile
     * Any authenticated user — update their own name/phone/address/location.
     * Email and role can never be changed here.
     */
    public function updateProfile(array $auth): void
    {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $fields = [];
        $params = ['id' => (int) $auth['sub']];

        if (isset($body['name']) && trim($body['name']) !== '') {
            $fields[] = 'name = :name';
            $params['name'] = trim($body['name']);
        }
        if (array_key_exists('phone', $body)) {
            $fields[] = 'phone = :phone';
            $params['phone'] = trim($body['phone'] ?? '');
        }
        if (array_key_exists('address', $body)) {
            $fields[] = 'address = :address';
            $params['address'] = trim($body['address'] ?? '');
        }
        if (isset($body['latitude']) && isset($body['longitude'])) {
            if (!Geo::isValidLatitude($body['latitude']) || !Geo::isValidLongitude($body['longitude'])) {
                Response::error('Invalid coordinates.', 422);
            }
            $fields[] = 'latitude = :latitude';
            $fields[] = 'longitude = :longitude';
            $params['latitude'] = $body['latitude'];
            $params['longitude'] = $body['longitude'];
        }

        if (!$fields) {
            Response::error('No fields to update.', 422);
        }

        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        // Keep the vehicles table's driver_name/driver_phone in sync so the
        // tracking UI doesn't show a stale name after a profile edit.
        if (($auth['role'] ?? '') === 'DRIVER' && (isset($params['name']) || isset($params['phone']))) {
            $vStmt = $this->db->prepare(
                'UPDATE vehicles SET driver_name = COALESCE(:name, driver_name), driver_phone = COALESCE(:phone, driver_phone) WHERE driver_id = :id'
            );
            $vStmt->execute([
                'name'  => $params['name'] ?? null,
                'phone' => $params['phone'] ?? null,
                'id'    => (int) $auth['sub'],
            ]);
        }

        $updated = $this->userModel->findById((int) $auth['sub']);
        Response::success(User::sanitize($updated), 'Profile updated.');
    }

    /**
     * PUT /auth/change-password
     * Any authenticated user — requires the current password to confirm
     * identity before setting a new one.
     */
    public function changePassword(array $auth): void
    {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($body['current_password']) || empty($body['new_password'])) {
            Response::error('Current password and new password are required.', 422);
        }
        if (strlen($body['new_password']) < 6) {
            Response::error('New password must be at least 6 characters.', 422);
        }

        $user = $this->userModel->findById((int) $auth['sub']);
        if (!$user || !password_verify($body['current_password'], $user['password'])) {
            Response::error('Current password is incorrect.', 401);
        }

        $stmt = $this->db->prepare('UPDATE users SET password = ? WHERE id = ?');
        $stmt->execute([password_hash($body['new_password'], PASSWORD_BCRYPT), $user['id']]);

        Response::success(null, 'Password changed successfully.');
    }

    private function setDriverStatus(array $auth, int $id, string $status): void
    {
        if (($auth['role'] ?? '') !== 'ADMIN') {
            Response::error('Admin access required.', 403);
        }

        $driver = $this->userModel->findById($id);

        if (!$driver) {
            Response::error('Driver not found.', 404);
        }
        if ($driver['role'] !== 'DRIVER') {
            Response::error('Selected user is not a driver.', 422);
        }

        $stmt = $this->db->prepare('UPDATE users SET status = ? WHERE id = ? AND role = "DRIVER"');
        $stmt->execute([$status, $id]);

        // Keep the driver's vehicle in sync with their approval state: an
        // approved driver's vehicle becomes assignable; anything else
        // takes it out of rotation.
        $vehicleStmt = $this->db->prepare('SELECT id, status FROM vehicles WHERE driver_id = ? LIMIT 1');
        $vehicleStmt->execute([$id]);
        $vehicle = $vehicleStmt->fetch();

        if ($vehicle) {
            if ($status === 'ACTIVE' && $vehicle['status'] === 'Offline') {
                $upd = $this->db->prepare('UPDATE vehicles SET status = "Available" WHERE id = ?');
                $upd->execute([$vehicle['id']]);
            } elseif (in_array($status, ['REJECTED', 'SUSPENDED', 'INACTIVE', 'PENDING'], true) && $vehicle['status'] === 'Available') {
                $upd = $this->db->prepare('UPDATE vehicles SET status = "Offline" WHERE id = ?');
                $upd->execute([$vehicle['id']]);
            }
        }

        $updatedDriver = $this->userModel->findById($id);

        Response::success(User::sanitize($updatedDriver), 'Driver status updated successfully.');
    }
}
