<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
include "db_connect.php";

if (isset($_GET["user_id"]) && isset($_GET["action"])) {
    $user_id = intval($_GET["user_id"]);
    $action = $_GET["action"];
    
    $stmt = $conn->prepare("INSERT INTO audit_logs (user_id, action) VALUES (?, ?)");
    $stmt->bind_param("is", $user_id, $action);
    if ($stmt->execute()) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Database error"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Missing parameters"]);
}
?>
