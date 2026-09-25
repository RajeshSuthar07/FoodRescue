<?php

require_once __DIR__ . '/../utils/Response.php';

class ReportController
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function dashboard(array $auth): void
    {
        RoleMiddleware::require($auth, ['ADMIN']);

        $counts = [];
        $counts['total_donations'] = (int) $this->db->query('SELECT COUNT(*) FROM donations')->fetchColumn();
        $counts['available_donations'] = (int) $this->db->query("SELECT COUNT(*) FROM donations WHERE status = 'Available'")->fetchColumn();
        $counts['completed_donations'] = (int) $this->db->query("SELECT COUNT(*) FROM donations WHERE status = 'Completed'")->fetchColumn();
        $counts['active_trips'] = (int) $this->db->query("SELECT COUNT(*) FROM vehicle_assignments WHERE status NOT IN ('Completed','Cancelled')")->fetchColumn();
        $counts['total_donors'] = (int) $this->db->query("SELECT COUNT(*) FROM users WHERE role = 'DONOR'")->fetchColumn();
        $counts['total_ngos'] = (int) $this->db->query("SELECT COUNT(*) FROM users WHERE role = 'NGO'")->fetchColumn();
        $counts['total_drivers'] = (int) $this->db->query("SELECT COUNT(*) FROM users WHERE role = 'DRIVER'")->fetchColumn();
        $counts['total_vehicles'] = (int) $this->db->query('SELECT COUNT(*) FROM vehicles')->fetchColumn();

        Response::success($counts);
    }

    public function donations(array $auth): void
    {
        RoleMiddleware::require($auth, ['ADMIN']);
        $rows = $this->db->query(
            'SELECT status, COUNT(*) AS total FROM donations GROUP BY status'
        )->fetchAll();
        Response::success($rows);
    }

    public function deliveries(array $auth): void
    {
        RoleMiddleware::require($auth, ['ADMIN']);
        $rows = $this->db->query(
            "SELECT va.id, v.vehicle_number, d.food_name, va.status, va.assigned_at, va.completed_at
             FROM vehicle_assignments va
             JOIN vehicles v ON v.id = va.vehicle_id
             JOIN donations d ON d.id = va.donation_id
             ORDER BY va.id DESC LIMIT 100"
        )->fetchAll();
        Response::success($rows);
    }

    public function vehicles(array $auth): void
    {
        RoleMiddleware::require($auth, ['ADMIN']);
        $rows = $this->db->query('SELECT * FROM vehicles ORDER BY id')->fetchAll();
        Response::success($rows);
    }
}
