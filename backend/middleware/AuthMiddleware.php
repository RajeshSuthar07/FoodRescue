<?php

require_once __DIR__ . '/../utils/JWT.php';
require_once __DIR__ . '/../utils/Response.php';

class AuthMiddleware
{
    /**
     * Reads the Authorization: Bearer <token> header, validates it and
     * returns the decoded JWT payload (contains user id, role, email).
     * Halts the request with a 401 JSON response if invalid/missing.
     *
     * If a PDO connection is passed, this also re-checks the user's LIVE
     * status in the database on every request — not just at login. This
     * matters because a JWT is valid for up to 12 hours; without this
     * check, an admin suspending/rejecting a driver mid-session wouldn't
     * actually stop that driver's already-issued token from working until
     * it naturally expired.
     */
    public static function authenticate(?PDO $db = null): array
    {
        $headers = self::getHeaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (!$authHeader || stripos($authHeader, 'Bearer ') !== 0) {
            Response::error('Authorization token missing.', 401);
        }

        $token = trim(substr($authHeader, 7));
        $config = require __DIR__ . '/../config/app.php';

        $payload = JWT::decode($token, $config['jwt_secret']);

        if (!$payload) {
            Response::error('Invalid or expired token. Please log in again.', 401);
        }

        if ($db !== null) {
            $stmt = $db->prepare('SELECT status FROM users WHERE id = ? LIMIT 1');
            $stmt->execute([$payload['sub'] ?? 0]);
            $status = $stmt->fetchColumn();

            if ($status === false) {
                Response::error('Account not found. Please log in again.', 401);
            }
            if ($status !== 'ACTIVE') {
                Response::error('Your account is no longer active. Please contact the administrator.', 403);
            }
        }

        return $payload;
    }

    private static function getHeaders(): array
    {
        if (function_exists('getallheaders')) {
            $h = getallheaders();
            if ($h !== false) {
                return $h;
            }
        }

        // Fallback for servers where getallheaders() is unavailable (some
        // InfinityFree/CGI configurations).
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (strpos($key, 'HTTP_') === 0) {
                $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
                $headers[$name] = $value;
            }
        }
        if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) && !isset($headers['Authorization'])) {
            $headers['Authorization'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        return $headers;
    }
}
