<?php
$host = "localhost";
$username = "root"; // Default XAMPP username
$password = ""; // Default XAMPP password is empty
$database = "agri_guard_db";

$conn = new mysqli($host, $username, $password);

// Check connection
if ($conn->connect_error) {
    die(json_encode(["error" => "Connection failed: " . $conn->connect_error]));
}

// Create database if not exists
$conn->query("CREATE DATABASE IF NOT EXISTS " . $database);
$conn->select_db($database);

// Set charset
$conn->set_charset("utf8mb4");
?>
