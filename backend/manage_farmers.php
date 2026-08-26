<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
include 'db_connect.php';

$action = $_GET['action'] ?? '';

if ($action === 'list') {
    $result = $conn->query("SELECT id, username, created_at FROM users WHERE role = 'farmer'");
    $farmers = [];
    while ($row = $result->fetch_assoc()) {
        $farmers[] = $row;
    }
    echo json_encode(["status" => "success", "farmers" => $farmers]);
} 
else if ($action === 'add') {
    $username = $_GET['username'] ?? '';
    $password = $_GET['password'] ?? '';
    
    if (!$username || !$password) {
        echo json_encode(["status" => "error", "message" => "Username and password required"]);
        exit;
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $conn->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'farmer')");
    $stmt->bind_param("ss", $username, $hash);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Farmer account created"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Username might already exist"]);
    }
}
else if ($action === 'delete') {
    $id = $_GET['id'] ?? '';
    if (!$id) {
        echo json_encode(["status" => "error", "message" => "ID required"]);
        exit;
    }

    $stmt = $conn->prepare("DELETE FROM users WHERE id = ? AND role = 'farmer'");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Farmer account deleted"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to delete account"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Invalid action"]);
}
?>
