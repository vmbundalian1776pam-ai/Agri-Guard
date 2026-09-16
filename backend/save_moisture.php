<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
include "db_connect.php";

$field_id = isset($_REQUEST["field_id"]) ? intval($_REQUEST["field_id"]) : 1;
$moisture = isset($_REQUEST["moisture"]) ? floatval($_REQUEST["moisture"]) : null;

if ($moisture === null) {
    echo json_encode(["status" => "error", "message" => "moisture value is required"]);
    exit;
}

$stmt = $conn->prepare("UPDATE fields SET latest_moisture = ?, moisture_updated_at = NOW() WHERE id = ?");
$stmt->bind_param("di", $moisture, $field_id);

if ($stmt->execute()) {
    echo json_encode(["status" => "success", "moisture" => $moisture]);
} else {
    echo json_encode(["status" => "error", "message" => $conn->error]);
}
?>
