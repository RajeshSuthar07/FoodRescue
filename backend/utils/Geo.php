<?php

class Geo
{
    /** Great-circle distance between two points, in meters. */
    public static function distanceMeters(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000; // meters

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2)
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    public static function isValidLatitude($lat): bool
    {
        return is_numeric($lat) && $lat >= -90 && $lat <= 90;
    }

    public static function isValidLongitude($lon): bool
    {
        return is_numeric($lon) && $lon >= -180 && $lon <= 180;
    }
}
