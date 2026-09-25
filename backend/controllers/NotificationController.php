<?php

require_once __DIR__ . '/../models/Notification.php';
require_once __DIR__ . '/../utils/Response.php';

class NotificationController
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function index(array $auth): void
    {
        Response::success((new Notification($this->db))->forUser((int) $auth['sub']));
    }

    public function markRead(array $auth, int $id): void
    {
        (new Notification($this->db))->markRead($id, (int) $auth['sub']);
        Response::success(null, 'Notification marked as read.');
    }
}
