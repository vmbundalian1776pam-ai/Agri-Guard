CREATE DATABASE IF NOT EXISTS agri_guard_db;
USE agri_guard_db;

CREATE TABLE IF NOT EXISTS fields (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    status ENUM('healthy', 'attention_needed', 'unknown') DEFAULT 'unknown',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('owner', 'farmer') NOT NULL DEFAULT 'farmer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    field_id INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    result_disease VARCHAR(255),
    confidence DECIMAL(5,2),
    recommendation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE
);

-- Pre-seed the single field
INSERT IGNORE INTO fields (id, name, location, status) VALUES (1, 'Eggplant Field', 'Main Zone', 'unknown');

-- Pre-seed the admin user (plain text password, will be handled by API or updated)
INSERT IGNORE INTO users (username, password, role) VALUES ('admin', 'admin123', 'owner');
