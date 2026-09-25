<?php
/**
 * Application configuration.
 *
 * IMPORTANT: change JWT_SECRET to a long random string before deploying.
 * This value must NEVER be exposed to the React frontend.
 * Generate one with: bin2hex(random_bytes(32))
 */

return [
    'jwt_secret'      => getenv('JWT_SECRET') ?: '3fe9fdea5ea758339e12f3040a2531e2e1807709d392a4aafbec3e40595c50f5',
    'jwt_ttl_seconds' => 60 * 60 * 12, // 12 hours
    'jwt_issuer'      => 'foodrescue-api',

    // Comma separated list of allowed origins for CORS.
    // In production, set this to your exact InfinityFree/custom domain, e.g.
    // 'https://foodrescue.infinityfreeapp.com'
    //
    // >>> ONCE YOU HAVE YOUR INFINITYFREE DOMAIN, CHANGE THE LINE BELOW <<<
    // 'allowed_origins' => explode(',', getenv('ALLOWED_ORIGINS') ?: 'https://YOUR-DOMAIN-HERE.infinityfreeapp.com'),
    'allowed_origins' => explode(',', getenv('ALLOWED_ORIGINS') ?: 'https://foodrescue.free.nf'),

    // Arrival-detection radius in meters for auto pickup/delivery detection.
    'arrival_radius_meters' => 80,
];
