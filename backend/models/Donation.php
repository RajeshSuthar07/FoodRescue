<?php

class Donation
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function create(array $d): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO donations (donor_id, food_name, food_type, quantity, description, expiry_date,
                pickup_address, pickup_latitude, pickup_longitude, status)
             VALUES (:donor_id, :food_name, :food_type, :quantity, :description, :expiry_date,
                :pickup_address, :pickup_latitude, :pickup_longitude, "Available")'
        );
        $stmt->execute([
            'donor_id'         => $d['donor_id'],
            'food_name'        => $d['food_name'],
            'food_type'        => $d['food_type'],
            'quantity'         => $d['quantity'],
            'description'      => $d['description'] ?? null,
            'expiry_date'      => $d['expiry_date'],
            'pickup_address'   => $d['pickup_address'],
            'pickup_latitude'  => $d['pickup_latitude'],
            'pickup_longitude' => $d['pickup_longitude'],
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM donations WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function all(): array
    {
        $stmt = $this->db->query("SELECT d.*, u.name AS donor_name, u.phone AS donor_phone
            FROM donations d JOIN users u ON u.id = d.donor_id
            ORDER BY d.created_at DESC");
        return $stmt->fetchAll();
    }

    public function allAvailable(): array
    {
        $stmt = $this->db->query("SELECT d.*, u.name AS donor_name, u.phone AS donor_phone
            FROM donations d JOIN users u ON u.id = d.donor_id
            WHERE d.status = 'Available' ORDER BY d.created_at DESC");
        return $stmt->fetchAll();
    }

    public function byDonor(int $donorId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM donations WHERE donor_id = ? ORDER BY created_at DESC');
        $stmt->execute([$donorId]);
        return $stmt->fetchAll();
    }

    public function updateStatus(int $id, string $status): void
    {
        $stmt = $this->db->prepare('UPDATE donations SET status = ? WHERE id = ?');
        $stmt->execute([$status, $id]);
    }

    public function delete(int $id): void
    {
        $stmt = $this->db->prepare('DELETE FROM donations WHERE id = ?');
        $stmt->execute([$id]);
    }
}
