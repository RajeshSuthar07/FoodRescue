<?php

class VehicleLocation
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function insert(array $l): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO vehicle_locations (vehicle_id, assignment_id, latitude, longitude, accuracy, speed, heading)
             VALUES (:vehicle_id, :assignment_id, :latitude, :longitude, :accuracy, :speed, :heading)'
        );
        $stmt->execute($l);
        return (int) $this->db->lastInsertId();
    }

    public function latestForVehicle(int $vehicleId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM vehicle_locations WHERE vehicle_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 1'
        );
        $stmt->execute([$vehicleId]);
        return $stmt->fetch() ?: null;
    }

    public function historyForAssignment(int $assignmentId, int $limit = 500): array
    {
        $stmt = $this->db->prepare(
            'SELECT latitude, longitude, accuracy, speed, heading, recorded_at
             FROM vehicle_locations WHERE assignment_id = ? ORDER BY recorded_at ASC LIMIT ?'
        );
        $stmt->bindValue(1, $assignmentId, PDO::PARAM_INT);
        $stmt->bindValue(2, $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
