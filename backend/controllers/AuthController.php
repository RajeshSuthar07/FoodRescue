<?php

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../utils/JWT.php';
require_once __DIR__ . '/../utils/Response.php';

class AuthController
{
    private PDO $db;
    private array $config;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->config = require __DIR__ . '/../config/app.php';
    }

    /*
    |--------------------------------------------------------------------------
    | REGISTER
    |--------------------------------------------------------------------------
    */
    public function register(): void
    {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        // Required fields
        $required = ['name', 'email', 'password', 'role'];

        foreach ($required as $field) {
            if (empty($body[$field])) {
                Response::error("Field '{$field}' is required.", 422);
            }
        }

        // Allowed roles
        $allowedRoles = ['DONOR', 'NGO', 'DRIVER'];

        if (!in_array($body['role'], $allowedRoles, true)) {
            Response::error('Invalid role.', 422);
        }

        // Email validation
        $email = strtolower(trim($body['email']));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Invalid email address.', 422);
        }

        // Password validation
        if (strlen($body['password']) < 6) {
            Response::error(
                'Password must be at least 6 characters.',
                422
            );
        }

        // Driver must provide vehicle number
        $vehicleNumber = null;

        if ($body['role'] === 'DRIVER') {

            if (empty(trim($body['vehicle_number'] ?? ''))) {
                Response::error(
                    'Vehicle number is required for drivers.',
                    422
                );
            }

            $vehicleNumber = strtoupper(
                trim($body['vehicle_number'])
            );

            // Check vehicle number already exists
            $vehicleCheck = $this->db->prepare(
                'SELECT id FROM vehicles WHERE vehicle_number = ? LIMIT 1'
            );

            $vehicleCheck->execute([$vehicleNumber]);

            if ($vehicleCheck->fetch()) {
                Response::error(
                    'This vehicle number is already registered.',
                    409
                );
            }
        }

        $userModel = new User($this->db);

        // Check duplicate email
        if ($userModel->findByEmail($email)) {
            Response::error(
                'An account with this email already exists.',
                409
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Transaction
        |--------------------------------------------------------------------------
        | Driver registration creates:
        | 1. users record
        | 2. vehicles record
        |
        | Both should succeed together.
        */

        try {

            $this->db->beginTransaction();

            /*
            |--------------------------------------------------------------------------
            | Create user
            |--------------------------------------------------------------------------
            */

            $userId = $userModel->create([
                'name'      => trim($body['name']),
                'email'     => $email,
                'password'  => password_hash(
                    $body['password'],
                    PASSWORD_BCRYPT
                ),
                'phone'     => trim($body['phone'] ?? ''),
                'role'      => $body['role'],
                'address'   => trim($body['address'] ?? ''),
                'latitude'  => $body['latitude'] ?? null,
                'longitude' => $body['longitude'] ?? null,
                // Drivers need admin approval before they can log in;
                // Donors and NGOs stay immediately usable.
                'status'    => $body['role'] === 'DRIVER' ? 'PENDING' : 'ACTIVE',
            ]);

            /*
            |--------------------------------------------------------------------------
            | Create vehicle for DRIVER
            |--------------------------------------------------------------------------
            */

            if ($body['role'] === 'DRIVER') {

                $vehicle = $this->db->prepare(
                    'INSERT INTO vehicles
                    (
                        vehicle_number,
                        driver_id,
                        driver_name,
                        driver_phone,
                        status
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?
                    )'
                );

                // Vehicle stays 'Offline' (not assignable) until the admin
                // approves the driver — otherwise an unapproved driver's
                // vehicle could be assigned to a trip before review.
                $vehicle->execute([
                    $vehicleNumber,
                    $userId,
                    trim($body['name']),
                    trim($body['phone'] ?? ''),
                    'Offline'
                ]);
            }

            $this->db->commit();

        } catch (Throwable $e) {

            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            error_log(
                'Registration error: ' . $e->getMessage()
            );

            Response::error(
                'Registration failed. Please try again.',
                500
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Get newly created user
        |--------------------------------------------------------------------------
        */

        $user = $userModel->findById($userId);

        if (!$user) {
            Response::error(
                'User was created but could not be loaded.',
                500
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Drivers start PENDING and need admin approval — do NOT issue a
        | token yet. Issuing a token here would let an unapproved driver
        | use every other endpoint (only /auth/login re-checks status),
        | completely bypassing the approval gate.
        |--------------------------------------------------------------------------
        */

        if ($user['status'] !== 'ACTIVE') {
            Response::success(
                [
                    'token' => null,
                    'user'  => User::sanitize($user),
                ],
                'Registration successful. Your driver account is pending admin approval — you will be able to log in once approved.',
                201
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Generate JWT
        |--------------------------------------------------------------------------
        */

        $token = $this->issueToken($user);

        /*
        |--------------------------------------------------------------------------
        | Response
        |--------------------------------------------------------------------------
        */

        Response::success(
            [
                'token' => $token,
                'user'  => User::sanitize($user),
            ],
            'Registration successful.',
            201
        );
    }

    /*
    |--------------------------------------------------------------------------
    | LOGIN
    |--------------------------------------------------------------------------
    */
    public function login(): void
    {
        $body = json_decode(
            file_get_contents('php://input'),
            true
        ) ?? [];

        if (
            empty($body['email']) ||
            empty($body['password'])
        ) {
            Response::error(
                'Email and password are required.',
                422
            );
        }

        $email = strtolower(trim($body['email']));

        $userModel = new User($this->db);

        $user = $userModel->findByEmail($email);

        if (
            !$user ||
            !password_verify(
                $body['password'],
                $user['password']
            )
        ) {
            Response::error(
                'Invalid email or password.',
                401
            );
        }

        if ($user['status'] !== 'ACTIVE') {
            if ($user['status'] === 'PENDING') {
                Response::error(
                    'Your driver account is waiting for admin approval. Please try again once approved.',
                    403
                );
            }
            if ($user['status'] === 'REJECTED') {
                Response::error(
                    'Your driver registration was rejected. Contact the administrator for details.',
                    403
                );
            }
            Response::error(
                'Your account is not active. Contact the administrator.',
                403
            );
        }

        $token = $this->issueToken($user);

        Response::success(
            [
                'token' => $token,
                'user'  => User::sanitize($user),
            ],
            'Login successful.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | LOGOUT
    |--------------------------------------------------------------------------
    */
    public function logout(): void
    {
        // JWT is stateless.
        // Client removes the token.
        Response::success(
            null,
            'Logged out.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | CURRENT USER
    |--------------------------------------------------------------------------
    */
    public function me(array $authPayload): void
    {
        $userModel = new User($this->db);

        $user = $userModel->findById(
            (int) $authPayload['sub']
        );

        if (!$user) {
            Response::error(
                'User not found.',
                404
            );
        }

        Response::success(
            User::sanitize($user)
        );
    }

    /*
    |--------------------------------------------------------------------------
    | JWT
    |--------------------------------------------------------------------------
    */
    private function issueToken(array $user): string
    {
        return JWT::encode(
            [
                'sub'   => $user['id'],
                'email' => $user['email'],
                'role'  => $user['role'],
                'name'  => $user['name'],
            ],
            $this->config['jwt_secret'],
            $this->config['jwt_ttl_seconds'],
            $this->config['jwt_issuer']
        );
    }
}