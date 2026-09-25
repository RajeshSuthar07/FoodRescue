<?php

class Vehicle
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function all(): array
    {
        $stmt = $this->db->query('SELECT * FROM vehicles ORDER BY id DESC');
        return $stmt->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM vehicles WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function findByDriver(int $driverId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM vehicles WHERE driver_id = ? LIMIT 1');
        $stmt->execute([$driverId]);
        return $stmt->fetch() ?: null;
    }

    public function create(array $v): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO vehicles (vehicle_number, driver_id, driver_name, driver_phone, status)
             VALUES (?, ?, ?, ?, "Available")'
        );
        $stmt->execute([$v['vehicle_number'], $v['driver_id'] ?? null, $v['driver_name'] ?? null, $v['driver_phone'] ?? null]);
        return (int) $this->db->lastInsertId();
    }

    public function updateStatus(int $id, string $status): void
    {
        $stmt = $this->db->prepare('UPDATE vehicles SET status = ? WHERE id = ?');
        $stmt->execute([$status, $id]);
    }

    public function updateLocation(int $id, float $lat, float $lon, ?float $accuracy, ?float $speed, ?float $heading): void
    {
        $stmt = $this->db->prepare(
            'UPDATE vehicles SET latitude = ?, longitude = ?, accuracy = ?, speed = ?, heading = ?, last_updated = NOW()
             WHERE id = ?'
        );
        $stmt->execute([$lat, $lon, $accuracy, $speed, $heading, $id]);
    }

    public function delete(int $id): void
    {
        $stmt = $this->db->prepare('DELETE FROM vehicles WHERE id = ?');
        $stmt->execute([$id]);
    }
}
