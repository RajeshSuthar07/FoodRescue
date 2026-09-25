<?php
/**
 * Database configuration.
 *
 * LOCAL (XAMPP): the defaults below work out of the box with a fresh
 * XAMPP install (MySQL running on localhost, root user, no password).
 *
 * PRODUCTION (InfinityFree): replace the four DB_* values with the
 * credentials shown in your InfinityFree "MySQL Databases" control
 * panel page. They look like:
 *   DB_HOST = sqlXXX.infinityfree.com
 *   DB_NAME = if0_XXXXXXXX_foodrescue
 *   DB_USER = if0_XXXXXXXX
 *   DB_PASS = (the password you set)
 *
 * NEVER commit real production credentials to a public GitHub repo.
 * On InfinityFree you can also read these from environment variables
 * if you prefer (getenv('DB_HOST') etc.) — this file falls back to
 * the hardcoded values below when no env var is present.
 */


    // ---- EDIT THESE FOR PRODUCTION / INFINITYFREE ----
    // IMPORTANT: 'pass' below is your MySQL/XAMPP database password —
    // it has NOTHING to do with your FoodRescue admin login password.
    // On a stock XAMPP install, MySQL's root user has NO password, so
    // leave this blank unless you specifically set a MySQL root password
    // yourself. Setting this to the wrong value breaks EVERY API call
    // with "Database connection failed."

return [
    'host'    => 'sql307.infinityfree.com',
    'name'    => 'if0_42717927_foodrescue',
    'user'    => 'if0_42717927',
    'pass'    => 'Foodrescue26',
    'charset' => 'utf8mb4',
];

