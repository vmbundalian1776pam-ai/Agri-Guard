<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
include "db_connect.php";

if (!isset($_GET["user_id"])) {
    echo json_encode(["status" => "error", "message" => "user_id is required"]);
    exit;
}

$user_id = intval($_GET["user_id"]);

$stmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$res = $stmt->get_result();
$user = $res->fetch_assoc();

if (!$user || $user["role"] !== "owner") {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

// Self-healing: auto-create audit_logs table if it does not exist
$conn->query("CREATE TABLE IF NOT EXISTS audit_logs (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, action VARCHAR(50) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)");

$stmt = $conn->prepare("SELECT a.id, a.action, a.created_at, u.username FROM audit_logs a JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT 100");
$stmt->execute();
$logs_res = $stmt->get_result();

$logs = [];
while($row = $logs_res->fetch_assoc()) {
    $logs[] = $row;
}

echo json_encode(["status" => "success", "data" => $logs]);
?>
