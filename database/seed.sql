-- =====================================================================
-- FoodRescue — Production admin seed
-- Creates ONLY the real admin account. No demo donors/NGOs/drivers/
-- vehicles/donations are inserted — donors and NGOs register themselves
-- through the app, and drivers register + require admin approval before
-- they can log in (see backend/controllers/AuthController.php and
-- UserController.php for the approve/reject flow).
-- =====================================================================

INSERT INTO users (name, email, password, phone, role, address, status)
VALUES (
    'Rajesh',
    'foodrescue26@gmail.com',
    '$2b$10$nJ.Cz3NVshkPNblZ0Xb2UeGGiwniSPK1H1qoBjZUE11DdC5A9VQcu', -- bcrypt hash of: Rajesh@Admin1
    NULL,
    'ADMIN',
    NULL,
    'ACTIVE'
);
