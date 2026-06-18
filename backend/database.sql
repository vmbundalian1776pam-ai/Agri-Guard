CREATE DATABASE IF NOT EXISTS agri_guard_db;
USE agri_guard_db;

CREATE TABLE IF NOT EXISTS fields (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    status ENUM('healthy', 'attention_needed', 'unknown') DEFAULT 'unknown',
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

-- Insert some dummy data for initial testing
INSERT INTO fields (name, location, status) VALUES 
('North Corn Field', 'Zone A', 'healthy'),
('Tomato Greenhouse', 'Zone B', 'attention_needed');
