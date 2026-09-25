<?php

class FoodRequestModel
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function create(int $donationId, int $ngoId): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO food_requests (donation_id, ngo_id, status) VALUES (?, ?, "Pending")'
        );
        $stmt->execute([$donationId, $ngoId]);
        return (int) $this->db->lastInsertId();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM food_requests WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function byDonation(int $donationId): array
    {
        $stmt = $this->db->prepare(
            'SELECT fr.*, u.name AS ngo_name, u.phone AS ngo_phone
             FROM food_requests fr JOIN users u ON u.id = fr.ngo_id
             WHERE fr.donation_id = ? ORDER BY fr.requested_at DESC'
        );
        $stmt->execute([$donationId]);
        return $stmt->fetchAll();
    }

    public function byNgo(int $ngoId): array
    {
        $stmt = $this->db->prepare(
            'SELECT fr.*, d.food_name, d.pickup_address, d.status AS donation_status
             FROM food_requests fr JOIN donations d ON d.id = fr.donation_id
             WHERE fr.ngo_id = ? ORDER BY fr.requested_at DESC'
        );
        $stmt->execute([$ngoId]);
        return $stmt->fetchAll();
    }

    public function byDonor(int $donorId): array
    {
        $stmt = $this->db->prepare(
            'SELECT fr.*, d.food_name, u.name AS ngo_name, u.phone AS ngo_phone
             FROM food_requests fr
             JOIN donations d ON d.id = fr.donation_id
             JOIN users u ON u.id = fr.ngo_id
             WHERE d.donor_id = ? ORDER BY fr.requested_at DESC'
        );
        $stmt->execute([$donorId]);
        return $stmt->fetchAll();
    }

    public function approve(int $id): void
    {
        $stmt = $this->db->prepare('UPDATE food_requests SET status = "Approved", approved_at = NOW() WHERE id = ?');
        $stmt->execute([$id]);
    }

    public function reject(int $id): void
    {
        $stmt = $this->db->prepare('UPDATE food_requests SET status = "Rejected", rejected_at = NOW() WHERE id = ?');
        $stmt->execute([$id]);
    }

    /** Reject all other pending requests for a donation once one is approved. */
    public function rejectOthers(int $donationId, int $exceptRequestId): void
    {
        $stmt = $this->db->prepare(
            'UPDATE food_requests SET status = "Rejected", rejected_at = NOW()
             WHERE donation_id = ? AND id != ? AND status = "Pending"'
        );
        $stmt->execute([$donationId, $exceptRequestId]);
    }
}
