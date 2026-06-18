<?php
header("Content-Type: application/json");
require_once "db_connect.php";

if (!isset($_GET['field_id'])) {
    echo json_encode(["status" => "error", "message" => "field_id is required"]);
    exit;
}

$field_id = intval($_GET['field_id']);

// Get field info
$stmt = $conn->prepare("SELECT * FROM fields WHERE id = ?");
$stmt->bind_param("i", $field_id);
$stmt->execute();
$field_result = $stmt->get_result();
$field = $field_result->fetch_assoc();

if (!$field) {
    echo json_encode(["status" => "error", "message" => "Field not found"]);
    exit;
}

// Get recent scans for this field
$stmt = $conn->prepare("SELECT * FROM scans WHERE field_id = ? ORDER BY created_at DESC LIMIT 10");
$stmt->bind_param("i", $field_id);
$stmt->execute();
$scans_result = $stmt->get_result();

$scans = [];
while($row = $scans_result->fetch_assoc()) {
    $scans[] = $row;
}

$field['recent_scans'] = $scans;

echo json_encode(["status" => "success", "data" => $field]);
$conn->close();
?>
