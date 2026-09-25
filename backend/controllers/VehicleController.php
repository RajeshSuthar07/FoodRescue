<?php

require_once __DIR__ . '/../models/Vehicle.php';
require_once __DIR__ . '/../utils/Response.php';

class VehicleController
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function index(array $auth): void
    {
        Response::success((new Vehicle($this->db))->all());
    }

    public function store(array $auth): void
    {
        RoleMiddleware::require($auth, ['ADMIN']);

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($body['vehicle_number'])) {
            Response::error("Field 'vehicle_number' is required.", 422);
        }

        $vehicleModel = new Vehicle($this->db);
        $id = $vehicleModel->create($body);

        Response::success($vehicleModel->find($id), 'Vehicle created.', 201);
    }

    public function update(array $auth, int $id): void
    {
        RoleMiddleware::require($auth, ['ADMIN']);

        $vehicleModel = new Vehicle($this->db);
        if (!$vehicleModel->find($id)) {
            Response::error('Vehicle not found.', 404);
        }

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $allowed = ['vehicle_number', 'driver_id', 'driver_name', 'driver_phone', 'status'];

        $fields = [];
        $params = ['id' => $id];
        foreach ($allowed as $f) {
            if (isset($body[$f])) {
                $fields[] = "$f = :$f";
                $params[$f] = $body[$f];
            }
        }

        if ($fields) {
            $sql = 'UPDATE vehicles SET ' . implode(', ', $fields) . ' WHERE id = :id';
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
        }

        Response::success($vehicleModel->find($id), 'Vehicle updated.');
    }

    public function destroy(array $auth, int $id): void
    {
        RoleMiddleware::require($auth, ['ADMIN']);
        (new Vehicle($this->db))->delete($id);
        Response::success(null, 'Vehicle deleted.');
    }
}
