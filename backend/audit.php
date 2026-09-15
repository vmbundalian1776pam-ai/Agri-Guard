<?php
header("Content-Type: application/json");
require_once "db_connect.php";

$conn->query("CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)");

$method = $_SERVER["REQUEST_METHOD"];

if ($method === "POST") {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!isset($data["user_id"]) || !isset($data["action"])) {
        echo json_encode(["status" => "error", "message" => "user_id and action required"]);
        exit;
    }
    
    $user_id = intval($data["user_id"]);
    $action = $conn->real_escape_string($data["action"]);
    
    $stmt = $conn->prepare("INSERT INTO audit_logs (user_id, action) VALUES (?, ?)");
    $stmt->bind_param("is", $user_id, $action);
    $stmt->execute();
    echo json_encode(["status" => "success"]);
} else if ($method === "GET") {
    if (!isset($_GET["user_id"])) {
        echo json_encode(["status" => "error", "message" => "user_id required"]);
        exit;
    }
    
    $user_id = intval($_GET["user_id"]);
    $check = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $check->bind_param("i", $user_id);
    $check->execute();
    $res = $check->get_result()->fetch_assoc();
    
    if (!$res || $res["role"] !== "owner") {
        echo json_encode(["status" => "error", "message" => "Unauthorized"]);
        exit;
    }
    
    $query = "SELECT a.id, a.action, a.created_at, u.username, u.role FROM audit_logs a JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT 50";
    $result = $conn->query($query);
    $logs = [];
    while($row = $result->fetch_assoc()) {
        $logs[] = $row;
    }
    echo json_encode(["status" => "success", "data" => $logs]);
}
$conn->close();
?>
