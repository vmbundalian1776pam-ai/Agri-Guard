<?php
header("Content-Type: application/json");
require_once "db_connect.php";

if (!isset($_GET['rover_ip'])) {
    echo json_encode(["status" => "error", "message" => "rover_ip is required"]);
    exit;
}

$rover_ip = trim($_GET['rover_ip']);
if (empty($rover_ip)) {
    echo json_encode(["status" => "error", "message" => "rover_ip cannot be empty"]);
    exit;
}

// 1. Try /capture on port 80 first (works if firmware was updated)
$capture_url = "http://" . $rover_ip . "/capture";
$ch = curl_init($capture_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 4);
$img_data = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// 2. If /capture fails (404), fall back to reading one frame from the MJPEG stream via CURL
//    CURL automatically decodes HTTP chunked transfer encoding, unlike raw fsockopen
if ($http_code !== 200 || empty($img_data)) {
    $frame_buf     = '';
    $img_data      = '';
    $frame_count   = 0;
    $capture_done  = false;

    $ch2 = curl_init("http://$rover_ip:81/stream");
    curl_setopt($ch2, CURLOPT_RETURNTRANSFER, false);
    curl_setopt($ch2, CURLOPT_TIMEOUT, 8);
    curl_setopt($ch2, CURLOPT_WRITEFUNCTION,
        function($curl, $data) use (&$frame_buf, &$img_data, &$frame_count, &$capture_done) {
            if ($capture_done) return 0; // Signal CURL to abort
            $frame_buf .= $data;

            // Search for complete JPEG frames using SOI (FF D8) and EOI (FF D9) markers
            $pos = 0;
            while (true) {
                $soi = strpos($frame_buf, "\xFF\xD8", $pos);
                if ($soi === false) {
                    // No JPEG start — keep only the last byte in case it was \xFF
                    $frame_buf = strlen($frame_buf) > 1 ? substr($frame_buf, -1) : $frame_buf;
                    $pos = 0;
                    break;
                }
                $eoi = strpos($frame_buf, "\xFF\xD9", $soi + 2);
                if ($eoi === false) {
                    // Have start but end not yet received — keep from start onwards
                    $frame_buf = substr($frame_buf, $soi);
                    $pos = 0;
                    break;
                }
                // Found a complete JPEG frame
                $frame_count++;
                if ($frame_count >= 2) {
                    // Take the 2nd frame (fresher, avoids stale buffer)
                    $img_data     = substr($frame_buf, $soi, $eoi - $soi + 2);
                    $capture_done = true;
                    return 0; // Abort curl transfer
                }
                $pos = $eoi + 2;
            }
            return strlen($data);
        }
    );
    curl_exec($ch2);
    curl_close($ch2);

    if (empty($img_data)) {
        echo json_encode(["status" => "error", "message" => "Failed to read a frame from Rover stream. Make sure the Rover camera is visible in the app before scanning."]);
        exit;
    }
}


// 2. Save the captured image to backend/uploads
$upload_dir = 'uploads/';
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

$filename = 'rover_' . uniqid() . '.jpg';
$target_file = $upload_dir . $filename;

if (!file_put_contents($target_file, $img_data)) {
    echo json_encode(["status" => "error", "message" => "Failed to save captured frame on server"]);
    exit;
}

// We always scan for the single Eggplant Field (field_id = 1)
$field_id = 1;

// 3. Call local Python AI server for plant disease prediction
$api_url = "http://127.0.0.1:5000/predict";
$cfile = new CURLFile($target_file, 'image/jpeg', basename($target_file));
$post_data = array('image' => $cfile);

$ch = curl_init($api_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
curl_setopt($ch, CURLOPT_TIMEOUT, 10); // Timeout for prediction

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$result_disease = "Unknown";
$confidence = 0;
$recommendation = "";
$field_status = "unknown";

if ($http_code == 200 && $response) {
    $parsed_ai = json_decode($response, true);
    if ($parsed_ai && !isset($parsed_ai['error'])) {
        $field_status = $parsed_ai['status'] ?? 'unknown';
        $result_disease = $parsed_ai['disease'] ?? 'Unknown';
        $recommendation = $parsed_ai['recommendation'] ?? '';
        $confidence = isset($parsed_ai['confidence']) ? floatval($parsed_ai['confidence']) : 0;
        if ($confidence > 0 && $confidence <= 1.0) {
            $confidence = $confidence * 100;
        }
        $confidence = round($confidence, 2);
    } else {
        $recommendation = "AI Server Error: " . ($parsed_ai['error'] ?? 'Unknown JSON response');
    }
} else {
    $recommendation = "AI Server is not running. Make sure app.py is running on port 5000.";
}

// 4. Save scan to database
$stmt = $conn->prepare("INSERT INTO scans (field_id, image_path, result_disease, confidence, recommendation) VALUES (?, ?, ?, ?, ?)");
$stmt->bind_param("issds", $field_id, $target_file, $result_disease, $confidence, $recommendation);
$stmt->execute();

// 5. Update the field's overall status
if ($field_status !== 'unknown') {
    $update_stmt = $conn->prepare("UPDATE fields SET status = ? WHERE id = ?");
    $update_stmt->bind_param("si", $field_status, $field_id);
    $update_stmt->execute();
}

// 6. Return response to app
echo json_encode([
    "status" => "success",
    "message" => "Rover image scanned successfully",
    "data" => [
        "disease" => $result_disease,
        "confidence" => $confidence,
        "recommendation" => $recommendation,
        "field_status" => $field_status,
        "image_url" => $target_file
    ]
]);

$conn->close();
?>
