<?php

class User
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM users WHERE email = ? LIMIT 1'
        );

        $stmt->execute([$email]);

        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM users WHERE id = ? LIMIT 1'
        );

        $stmt->execute([$id]);

        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO users
            (
                name,
                email,
                password,
                phone,
                role,
                address,
                latitude,
                longitude,
                status
            )
            VALUES
            (
                :name,
                :email,
                :password,
                :phone,
                :role,
                :address,
                :latitude,
                :longitude,
                :status
            )'
        );

        $stmt->execute([
            'name'      => $data['name'],
            'email'     => $data['email'],
            'password'  => $data['password'],
            'phone'     => $data['phone'] ?? null,
            'role'      => $data['role'],
            'address'   => $data['address'] ?? null,
            'latitude'  => $data['latitude'] ?? null,
            'longitude' => $data['longitude'] ?? null,
            'status'    => $data['status'] ?? 'ACTIVE',
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function findNearbyNGOs(
        float $lat,
        float $lon,
        float $radiusKm = 25
    ): array {
        $stmt = $this->db->prepare(
            "SELECT *
             FROM users
             WHERE role = 'NGO'
             AND status = 'ACTIVE'"
        );

        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function all(?string $role = null): array
    {
        if ($role) {

            $stmt = $this->db->prepare(
                'SELECT
                    id,
                    name,
                    email,
                    phone,
                    role,
                    address,
                    latitude,
                    longitude,
                    status,
                    created_at
                 FROM users
                 WHERE role = ?
                 ORDER BY id DESC'
            );

            $stmt->execute([$role]);

        } else {

            $stmt = $this->db->query(
                'SELECT
                    id,
                    name,
                    email,
                    phone,
                    role,
                    address,
                    latitude,
                    longitude,
                    status,
                    created_at
                 FROM users
                 ORDER BY id DESC'
            );
        }

        return $stmt->fetchAll();
    }

    public static function sanitize(array $user): array
    {
        unset($user['password']);

        return $user;
    }
}