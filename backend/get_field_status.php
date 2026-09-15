<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
require_once "db_connect.php";

if (!isset($_GET['field_id'])) {
    echo json_encode(["status" => "error", "message" => "field_id is required"]);
    exit;
}

$field_id = intval($_GET['field_id']);

// --- AUTO-CLEANUP: Delete scans older than 2 months to prevent storage bloat ---
$conn->query("DELETE FROM scans WHERE field_id = $field_id AND created_at < NOW() - INTERVAL 2 MONTH");

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

// Get ALL scans for this field (no limit) — ordered newest first
$stmt = $conn->prepare("SELECT * FROM scans WHERE field_id = ? ORDER BY created_at DESC");
$stmt->bind_param("i", $field_id);
$stmt->execute();
$scans_result = $stmt->get_result();

$scans = [];
while($row = $scans_result->fetch_assoc()) {
    $scans[] = $row;
}

// Derive the field's current status from the most recent scan
if (!empty($scans)) {
    $latest = $scans[0];
    if ($latest['result_disease'] === 'Not a Plant / Unrecognized') {
        // Don't let a bad scan override the field status; keep checking further back
        $field['status'] = 'unknown';
        foreach ($scans as $scan) {
            if ($scan['result_disease'] !== 'Not a Plant / Unrecognized') {
                $field['status'] = (stripos($scan['result_disease'], 'healthy') !== false) ? 'healthy' : 'attention_needed';
                break;
            }
        }
    } else {
        $field['status'] = (stripos($latest['result_disease'], 'healthy') !== false) ? 'healthy' : 'attention_needed';
    }
} else {
    $field['status'] = 'unknown';
}

$field['recent_scans'] = $scans;
$field['total_scans'] = count($scans);

echo json_encode(["status" => "success", "data" => $field]);
$conn->close();
?>
