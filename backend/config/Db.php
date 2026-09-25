<?php

/**
 * NOTE: this file is deliberately named Db.php (not Database.php) and the
 * class is named DbConnection (not Database). On case-insensitive
 * filesystems (Windows, default macOS), a file named "Database.php" and
 * the config file "database.php" in this same folder would collide into a
 * single file, silently corrupting one of them. Keeping the names visually
 * distinct avoids that entirely.
 */
class DbConnection
{
    private static ?PDO $instance = null;

    public static function connect(): PDO
    {
        if (self::$instance === null) {
            $cfg = require __DIR__ . '/database.php';
            $dsn = "mysql:host={$cfg['host']};dbname={$cfg['name']};charset={$cfg['charset']}";

            try {
                self::$instance = new PDO($dsn, $cfg['user'], $cfg['pass'], [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
            } catch (PDOException $e) {
                http_response_code(500);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'message' => 'Database connection failed. Check backend/config/database.php credentials.',
                ]);
                exit;
            }
        }

        return self::$instance;
    }
}
