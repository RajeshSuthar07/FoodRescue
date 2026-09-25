<?php

class VehicleAssignment
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function create(array $a): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO vehicle_assignments
                (vehicle_id, driver_id, donation_id, request_id, pickup_latitude, pickup_longitude,
                 destination_latitude, destination_longitude, status)
             VALUES (:vehicle_id, :driver_id, :donation_id, :request_id, :pickup_latitude, :pickup_longitude,
                 :destination_latitude, :destination_longitude, "Assigned")'
        );
        $stmt->execute($a);
        return (int) $this->db->lastInsertId();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT va.*, v.vehicle_number, v.latitude AS vehicle_latitude, v.longitude AS vehicle_longitude,
                    v.accuracy, v.speed, v.heading, v.last_updated, v.driver_name, v.driver_phone,
                    d.food_name, d.pickup_address
             FROM vehicle_assignments va
             JOIN vehicles v ON v.id = va.vehicle_id
             JOIN donations d ON d.id = va.donation_id
             WHERE va.id = ?'
        );
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function findActiveByVehicle(int $vehicleId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT va.*, v.vehicle_number, v.latitude AS vehicle_latitude, v.longitude AS vehicle_longitude,
                    v.accuracy, v.speed, v.heading, v.last_updated, v.driver_name, v.driver_phone,
                    d.food_name, d.pickup_address
             FROM vehicle_assignments va
             JOIN vehicles v ON v.id = va.vehicle_id
             JOIN donations d ON d.id = va.donation_id
             WHERE va.vehicle_id = ? AND va.status NOT IN ('Completed', 'Cancelled')
             ORDER BY va.id DESC LIMIT 1"
        );
        $stmt->execute([$vehicleId]);
        return $stmt->fetch() ?: null;
    }

    public function findActiveByDriver(int $driverId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT va.*, v.vehicle_number, d.food_name, d.pickup_address
             FROM vehicle_assignments va
             JOIN vehicles v ON v.id = va.vehicle_id
             JOIN donations d ON d.id = va.donation_id
             WHERE va.driver_id = ? AND va.status NOT IN ('Completed', 'Cancelled')
             ORDER BY va.id DESC LIMIT 1"
        );
        $stmt->execute([$driverId]);
        return $stmt->fetch() ?: null;
    }

    public function updateStatus(int $id, string $status, ?string $timestampColumn = null): void
    {
        if ($timestampColumn) {
            $stmt = $this->db->prepare("UPDATE vehicle_assignments SET status = ?, {$timestampColumn} = NOW() WHERE id = ?");
        } else {
            $stmt = $this->db->prepare('UPDATE vehicle_assignments SET status = ? WHERE id = ?');
        }
        $stmt->execute([$status, $id]);
    }

    public function history(int $driverId): array
    {
        $stmt = $this->db->prepare(
            "SELECT va.*, v.vehicle_number, d.food_name
             FROM vehicle_assignments va
             JOIN vehicles v ON v.id = va.vehicle_id
             JOIN donations d ON d.id = va.donation_id
             WHERE va.driver_id = ? ORDER BY va.id DESC"
        );
        $stmt->execute([$driverId]);
        return $stmt->fetchAll();
    }
}
