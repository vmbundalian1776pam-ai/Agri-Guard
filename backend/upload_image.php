<?php
header("Content-Type: application/json");
require_once "db_connect.php";

// Set your Gemini API Key here (WARNING: Do NOT upload your real key to GitHub!)
$gemini_api_key = "YOUR_API_KEY_HERE";

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["status" => "error", "message" => "Only POST requests are allowed"]);
    exit;
}

if (!isset($_FILES['image']) || !isset($_POST['field_id'])) {
    echo json_encode(["status" => "error", "message" => "Image and field_id are required"]);
    exit;
}

$field_id = intval($_POST['field_id']);

// Setup upload directory
$upload_dir = 'uploads/';
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

$file_extension = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
$filename = uniqid() . '.' . $file_extension;
$target_file = $upload_dir . $filename;

if (move_uploaded_file($_FILES['image']['tmp_name'], $target_file)) {
    // Call LOCAL Python AI Server
    $api_url = "http://127.0.0.1:5000/predict";
    
    // Create a CURLFile object
    $cfile = new CURLFile($target_file, mime_content_type($target_file), basename($target_file));
    $post_data = array('image' => $cfile);
    
    $ch = curl_init($api_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
    
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
            $recommendation = "AI Server Error: " . ($parsed_ai['error'] ?? 'Unknown JSON error');
        }
    } else {
        // Log exact API error for debugging
        $curl_err = curl_error($ch);
        $recommendation = "Debug: AI Server is not running. HTTP $http_code. Make sure app.py is running on port 5000.";
    }

    // Save scan to database
    $stmt = $conn->prepare("INSERT INTO scans (field_id, image_path, result_disease, confidence, recommendation) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("issds", $field_id, $target_file, $result_disease, $confidence, $recommendation);
    $stmt->execute();
    
    // Update field status
    if ($field_status !== 'unknown') {
        $update_stmt = $conn->prepare("UPDATE fields SET status = ? WHERE id = ?");
        $update_stmt->bind_param("si", $field_status, $field_id);
        $update_stmt->execute();
    }
    
    echo json_encode([
        "status" => "success", 
        "message" => "Image processed successfully",
        "data" => [
            "disease" => $result_disease,
            "confidence" => $confidence,
            "recommendation" => $recommendation,
            "field_status" => $field_status,
            "image_url" => $target_file
        ]
    ]);
    
} else {
    echo json_encode(["status" => "error", "message" => "Failed to upload image"]);
}

$conn->close();
?>
