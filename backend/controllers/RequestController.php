<?php

require_once __DIR__ . '/../models/FoodRequestModel.php';
require_once __DIR__ . '/../models/Donation.php';
require_once __DIR__ . '/../models/Notification.php';
require_once __DIR__ . '/../utils/Response.php';

class RequestController
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function index(array $auth): void
    {
        $requestModel = new FoodRequestModel($this->db);

        if ($auth['role'] === 'NGO') {
            Response::success($requestModel->byNgo((int) $auth['sub']));
        } elseif ($auth['role'] === 'DONOR') {
            Response::success($requestModel->byDonor((int) $auth['sub']));
        } else {
            Response::error('Unsupported role for this endpoint.', 403);
        }
    }

    public function store(array $auth): void
    {
        RoleMiddleware::require($auth, ['NGO']);

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($body['donation_id'])) {
            Response::error("Field 'donation_id' is required.", 422);
        }

        $donationModel = new Donation($this->db);
        $donation = $donationModel->find((int) $body['donation_id']);

        if (!$donation) {
            Response::error('Donation not found.', 404);
        }
        if ($donation['status'] !== 'Available') {
            Response::error('This donation is no longer available.', 409);
        }

        $requestModel = new FoodRequestModel($this->db);
        $requestId = $requestModel->create((int) $body['donation_id'], (int) $auth['sub']);

        $donationModel->updateStatus($donation['id'], 'Requested');

        (new Notification($this->db))->create(
            (int) $donation['donor_id'],
            'New request for your donation',
            "An NGO has requested your donation: {$donation['food_name']}.",
            'NEW_REQUEST'
        );

        Response::success($requestModel->find($requestId), 'Request submitted.', 201);
    }

    public function approve(array $auth, int $id): void
    {
        RoleMiddleware::require($auth, ['DONOR']);

        $requestModel = new FoodRequestModel($this->db);
        $request = $requestModel->find($id);
        if (!$request) {
            Response::error('Request not found.', 404);
        }

        $donationModel = new Donation($this->db);
        $donation = $donationModel->find((int) $request['donation_id']);

        if ((int) $donation['donor_id'] !== (int) $auth['sub']) {
            Response::error('You cannot approve this request.', 403);
        }
        if ($request['status'] !== 'Pending') {
            Response::error('This request has already been processed.', 409);
        }

        $requestModel->approve($id);
        $requestModel->rejectOthers((int) $donation['id'], $id);
        $donationModel->updateStatus($donation['id'], 'Approved');

        (new Notification($this->db))->create(
            (int) $request['ngo_id'],
            'Request approved',
            "Your request for {$donation['food_name']} was approved. A vehicle will be assigned shortly.",
            'REQUEST_APPROVED'
        );

        Response::success($requestModel->find($id), 'Request approved. Waiting for vehicle assignment.');
    }

    public function reject(array $auth, int $id): void
    {
        RoleMiddleware::require($auth, ['DONOR']);

        $requestModel = new FoodRequestModel($this->db);
        $request = $requestModel->find($id);
        if (!$request) {
            Response::error('Request not found.', 404);
        }

        $donationModel = new Donation($this->db);
        $donation = $donationModel->find((int) $request['donation_id']);

        if ((int) $donation['donor_id'] !== (int) $auth['sub']) {
            Response::error('You cannot reject this request.', 403);
        }
        if ($request['status'] !== 'Pending') {
            Response::error('This request has already been processed.', 409);
        }

        $requestModel->reject($id);
        $donationModel->updateStatus($donation['id'], 'Available');

        (new Notification($this->db))->create(
            (int) $request['ngo_id'],
            'Request rejected',
            "Your request for {$donation['food_name']} was rejected by the donor.",
            'REQUEST_REJECTED'
        );

        Response::success($requestModel->find($id), 'Request rejected.');
    }
}
