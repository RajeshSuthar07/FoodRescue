<?php

require_once __DIR__ . '/../utils/Response.php';

class RoleMiddleware
{
    /** @param string[] $allowedRoles */
    public static function require(array $payload, array $allowedRoles): void
    {
        $role = $payload['role'] ?? null;

        if (!$role || !in_array($role, $allowedRoles, true)) {
            Response::error('You do not have permission to perform this action.', 403);
        }
    }
}
