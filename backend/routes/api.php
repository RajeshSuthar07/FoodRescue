<?php

/**
 * FoodRescue REST API Router
 *
 * Handles:
 * - Authentication
 * - Donations
 * - Food requests
 * - Vehicles
 * - Vehicle assignments
 * - Live tracking
 * - Notifications
 * - Reports
 * - Driver management
 */

require_once __DIR__ . '/../config/Db.php';

require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';

require_once __DIR__ . '/../controllers/AuthController.php';
require_once __DIR__ . '/../controllers/DonationController.php';
require_once __DIR__ . '/../controllers/RequestController.php';
require_once __DIR__ . '/../controllers/VehicleController.php';
require_once __DIR__ . '/../controllers/AssignmentController.php';
require_once __DIR__ . '/../controllers/TrackingController.php';
require_once __DIR__ . '/../controllers/NotificationController.php';
require_once __DIR__ . '/../controllers/ReportController.php';
require_once __DIR__ . '/../controllers/UserController.php';

require_once __DIR__ . '/../utils/Response.php';

$db = DbConnection::connect();

$method = $_SERVER['REQUEST_METHOD'];

$requestPath = parse_url(
    $_SERVER['REQUEST_URI'],
    PHP_URL_PATH
) ?? '';

$path = $requestPath;

if (preg_match('#/api(?:/|$)(.*)$#', $requestPath, $matches)) {
    $path = '/' . trim($matches[1], '/');
} else {
    $path = '/' . trim($requestPath, '/');
}

$segments = array_values(
    array_filter(
        explode('/', $path),
        fn ($segment) => $segment !== ''
    )
);

function matchRoute(
    string $pattern,
    array $segments
): ?array {

    $patternSegments = array_values(
        array_filter(
            explode('/', $pattern),
            fn ($segment) => $segment !== ''
        )
    );

    if (count($patternSegments) !== count($segments)) {
        return null;
    }

    $params = [];

    foreach ($patternSegments as $i => $patternSegment) {

        if (
            preg_match(
                '/^\{(\w+)\}$/',
                $patternSegment,
                $matches
            )
        ) {

            if (!ctype_digit($segments[$i])) {
                return null;
            }

            $params[$matches[1]] = (int) $segments[$i];

        } else {

            if ($patternSegment !== $segments[$i]) {
                return null;
            }
        }
    }

    return $params;
}

$authController = new AuthController($db);
$donationController = new DonationController($db);
$requestController = new RequestController($db);
$vehicleController = new VehicleController($db);
$assignmentController = new AssignmentController($db);
$trackingController = new TrackingController($db);
$notificationController = new NotificationController($db);
$reportController = new ReportController($db);
$userController = new UserController($db);

$routes = [

    // AUTH
    [
        'POST',
        '/auth/register',
        fn () => $authController->register(),
        false
    ],

    [
        'POST',
        '/auth/login',
        fn () => $authController->login(),
        false
    ],

    [
        'POST',
        '/auth/logout',
        fn () => $authController->logout(),
        false
    ],

    [
        'GET',
        '/auth/me',
        fn ($auth) => $authController->me($auth),
        true
    ],

    // USERS / DRIVERS
    [
        'GET',
        '/users/drivers',
        fn ($auth) => $userController->drivers($auth),
        true
    ],

    [
        'PUT',
        '/users/drivers/{id}/approve',
        fn ($auth, $params) =>
            $userController->approveDriver(
                $auth,
                $params['id']
            ),
        true
    ],

    [
        'PUT',
        '/users/drivers/{id}/reject',
        fn ($auth, $params) =>
            $userController->rejectDriver(
                $auth,
                $params['id']
            ),
        true
    ],

    [
        'PUT',
        '/users/drivers/{id}/status',
        fn ($auth, $params) =>
            $userController->updateDriverStatus(
                $auth,
                $params['id']
            ),
        true
    ],

    // PROFILE / ACCOUNT (any authenticated role)
    [
        'PUT',
        '/auth/profile',
        fn ($auth) => $userController->updateProfile($auth),
        true
    ],

    [
        'PUT',
        '/auth/change-password',
        fn ($auth) => $userController->changePassword($auth),
        true
    ],

    // DONATIONS
    [
        'GET',
        '/donations',
        fn ($auth) => $donationController->index($auth),
        true
    ],

    [
        'POST',
        '/donations',
        fn ($auth) => $donationController->store($auth),
        true
    ],

    [
        'GET',
        '/donations/{id}',
        fn ($auth, $params) =>
            $donationController->show(
                $auth,
                $params['id']
            ),
        true
    ],

    [
        'PUT',
        '/donations/{id}',
        fn ($auth, $params) =>
            $donationController->update(
                $auth,
                $params['id']
            ),
        true
    ],

    [
        'DELETE',
        '/donations/{id}',
        fn ($auth, $params) =>
            $donationController->destroy(
                $auth,
                $params['id']
            ),
        true
    ],

    // FOOD REQUESTS
    [
        'GET',
        '/requests',
        fn ($auth) => $requestController->index($auth),
        true
    ],

    [
        'POST',
        '/requests',
        fn ($auth) => $requestController->store($auth),
        true
    ],

    [
        'PUT',
        '/requests/{id}/approve',
        fn ($auth, $params) =>
            $requestController->approve(
                $auth,
                $params['id']
            ),
        true
    ],

    [
        'PUT',
        '/requests/{id}/reject',
        fn ($auth, $params) =>
            $requestController->reject(
                $auth,
                $params['id']
            ),
        true
    ],

    // VEHICLES
    [
        'GET',
        '/vehicles',
        fn ($auth) => $vehicleController->index($auth),
        true
    ],

    [
        'POST',
        '/vehicles',
        fn ($auth) => $vehicleController->store($auth),
        true
    ],

    [
        'PUT',
        '/vehicles/{id}',
        fn ($auth, $params) =>
            $vehicleController->update(
                $auth,
                $params['id']
            ),
        true
    ],

    [
        'DELETE',
        '/vehicles/{id}',
        fn ($auth, $params) =>
            $vehicleController->destroy(
                $auth,
                $params['id']
            ),
        true
    ],

    // ASSIGNMENTS
    [
        'POST',
        '/assignments',
        fn ($auth) => $assignmentController->store($auth),
        true
    ],

    [
        'GET',
        '/assignments/{id}',
        fn ($auth, $params) =>
            $assignmentController->show(
                $auth,
                $params['id']
            ),
        true
    ],

    [
        'PUT',
        '/assignments/{id}/start',
        fn ($auth, $params) =>
            $assignmentController->start(
                $auth,
                $params['id']
            ),
        true
    ],

    [
        'PUT',
        '/assignments/{id}/pickup',
        fn ($auth, $params) =>
            $assignmentController->pickup(
                $auth,
                $params['id']
            ),
        true
    ],

    [
        'PUT',
        '/assignments/{id}/deliver',
        fn ($auth, $params) =>
            $assignmentController->deliver(
                $auth,
                $params['id']
            ),
        true
    ],

    // TRACKING
    [
        'POST',
        '/tracking/update-location',
        fn ($auth) =>
            $trackingController->updateLocation($auth),
        true
    ],

    [
        'GET',
        '/tracking/vehicle/{id}',
        fn ($auth, $params) =>
            $trackingController->vehicle(
                $auth,
                $params['id']
            ),
        true
    ],

    [
        'GET',
        '/tracking/assignment/{id}',
        fn ($auth, $params) =>
            $trackingController->assignment(
                $auth,
                $params['id']
            ),
        true
    ],

    [
        'GET',
        '/tracking/history/{id}',
        fn ($auth, $params) =>
            $trackingController->history(
                $auth,
                $params['id']
            ),
        true
    ],

    // NOTIFICATIONS
    [
        'GET',
        '/notifications',
        fn ($auth) =>
            $notificationController->index($auth),
        true
    ],

    [
        'PUT',
        '/notifications/{id}/read',
        fn ($auth, $params) =>
            $notificationController->markRead(
                $auth,
                $params['id']
            ),
        true
    ],

    // REPORTS
    [
        'GET',
        '/reports/dashboard',
        fn ($auth) => $reportController->dashboard($auth),
        true
    ],

    [
        'GET',
        '/reports/donations',
        fn ($auth) => $reportController->donations($auth),
        true
    ],

    [
        'GET',
        '/reports/deliveries',
        fn ($auth) => $reportController->deliveries($auth),
        true
    ],

    [
        'GET',
        '/reports/vehicles',
        fn ($auth) => $reportController->vehicles($auth),
        true
    ],
];

foreach (
    $routes
    as [
        $routeMethod,
        $pattern,
        $handler,
        $requiresAuth
    ]
) {

    if ($routeMethod !== $method) {
        continue;
    }

    $params = matchRoute(
        $pattern,
        $segments
    );

    if ($params === null) {
        continue;
    }

    $auth = null;

    if ($requiresAuth) {
        $auth = AuthMiddleware::authenticate($db);
    }

    $handler($auth, $params);

    exit;
}

Response::error(
    'Route not found: ' .
    $method .
    ' ' .
    $path,
    404
);