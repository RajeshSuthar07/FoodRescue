-- =====================================================================
-- FoodRescue - Smart Food Sharing Platform
-- MySQL Database Schema (InfinityFree / MySQL 5.7+ / 8 compatible)
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    role ENUM('DONOR','NGO','ADMIN','DRIVER') NOT NULL DEFAULT 'DONOR',
    address VARCHAR(255) DEFAULT NULL,
    latitude DECIMAL(10,7) DEFAULT NULL,
    longitude DECIMAL(10,7) DEFAULT NULL,
    status ENUM('PENDING','ACTIVE','INACTIVE','SUSPENDED','REJECTED') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_role (role),
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- DONATIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    donor_id INT UNSIGNED NOT NULL,
    food_name VARCHAR(150) NOT NULL,
    food_type ENUM('VEG','NON_VEG','MIXED','PACKAGED','BAKERY','OTHER') NOT NULL DEFAULT 'VEG',
    quantity VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    expiry_date DATETIME NOT NULL,
    pickup_address VARCHAR(255) NOT NULL,
    pickup_latitude DECIMAL(10,7) NOT NULL,
    pickup_longitude DECIMAL(10,7) NOT NULL,
    status ENUM(
        'Available','Requested','Approved','Vehicle Assigned','Pickup in Progress',
        'Arrived at Pickup','Food Picked Up','Delivering','Arrived at NGO',
        'Delivered','Completed','Rejected','Cancelled'
    ) NOT NULL DEFAULT 'Available',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_donations_status (status),
    INDEX idx_donations_donor (donor_id),
    INDEX idx_donations_location (pickup_latitude, pickup_longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- FOOD REQUESTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS food_requests (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    donation_id INT UNSIGNED NOT NULL,
    ngo_id INT UNSIGNED NOT NULL,
    status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME DEFAULT NULL,
    rejected_at DATETIME DEFAULT NULL,
    FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE,
    FOREIGN KEY (ngo_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_requests_donation (donation_id),
    INDEX idx_requests_ngo (ngo_id),
    INDEX idx_requests_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- VEHICLES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_number VARCHAR(50) NOT NULL UNIQUE,
    driver_id INT UNSIGNED DEFAULT NULL,
    driver_name VARCHAR(150) DEFAULT NULL,
    driver_phone VARCHAR(20) DEFAULT NULL,
    latitude DECIMAL(10,7) DEFAULT NULL,
    longitude DECIMAL(10,7) DEFAULT NULL,
    accuracy DECIMAL(6,2) DEFAULT NULL,
    speed DECIMAL(6,2) DEFAULT NULL,
    heading DECIMAL(6,2) DEFAULT NULL,
    status ENUM('Available','Assigned','On the Way','Arrived at Pickup','Food Picked Up',
        'Delivering','Arrived at NGO','Delivered','Offline') NOT NULL DEFAULT 'Available',
    last_updated DATETIME DEFAULT NULL,
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_vehicles_driver (driver_id),
    INDEX idx_vehicles_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- VEHICLE ASSIGNMENTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_assignments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT UNSIGNED NOT NULL,
    driver_id INT UNSIGNED NOT NULL,
    donation_id INT UNSIGNED NOT NULL,
    request_id INT UNSIGNED NOT NULL,
    pickup_latitude DECIMAL(10,7) NOT NULL,
    pickup_longitude DECIMAL(10,7) NOT NULL,
    destination_latitude DECIMAL(10,7) NOT NULL,
    destination_longitude DECIMAL(10,7) NOT NULL,
    status ENUM('Assigned','On the Way','Arrived at Pickup','Food Picked Up',
        'Delivering','Arrived at NGO','Delivered','Completed','Cancelled') NOT NULL DEFAULT 'Assigned',
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME DEFAULT NULL,
    pickup_arrived_at DATETIME DEFAULT NULL,
    picked_up_at DATETIME DEFAULT NULL,
    delivery_started_at DATETIME DEFAULT NULL,
    destination_arrived_at DATETIME DEFAULT NULL,
    delivered_at DATETIME DEFAULT NULL,
    completed_at DATETIME DEFAULT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES food_requests(id) ON DELETE CASCADE,
    INDEX idx_assignments_vehicle (vehicle_id),
    INDEX idx_assignments_driver (driver_id),
    INDEX idx_assignments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- VEHICLE LOCATIONS (real GPS history log)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_locations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT UNSIGNED NOT NULL,
    assignment_id INT UNSIGNED DEFAULT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    accuracy DECIMAL(6,2) DEFAULT NULL,
    speed DECIMAL(6,2) DEFAULT NULL,
    heading DECIMAL(6,2) DEFAULT NULL,
    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (assignment_id) REFERENCES vehicle_assignments(id) ON DELETE SET NULL,
    INDEX idx_locations_vehicle (vehicle_id),
    INDEX idx_locations_assignment (assignment_id),
    INDEX idx_locations_recorded (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'INFO',
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- PICKUP CONFIRMATIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pickup_confirmations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id INT UNSIGNED NOT NULL,
    vehicle_id INT UNSIGNED NOT NULL,
    picked_up_at DATETIME DEFAULT NULL,
    delivered_at DATETIME DEFAULT NULL,
    confirmation_status ENUM('PENDING','PICKED_UP','DELIVERED') NOT NULL DEFAULT 'PENDING',
    FOREIGN KEY (request_id) REFERENCES food_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- Safe to re-run: extends the status enum for installs created before the
-- driver-approval feature existed. New installs already get this from the
-- CREATE TABLE above.
ALTER TABLE users
MODIFY status ENUM('PENDING','ACTIVE','INACTIVE','SUSPENDED','REJECTED')
NOT NULL DEFAULT 'ACTIVE';