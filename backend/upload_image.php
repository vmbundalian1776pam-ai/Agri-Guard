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
    
    // Convert image to base64 for Gemini API
    $image_data = base64_encode(file_get_contents($target_file));
    $mime_type = mime_content_type($target_file);
    
    // Call Gemini API
    $api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . $gemini_api_key;
    
    $prompt = "Analyze this image of a plant. Determine if it is healthy or if it has a disease. If it has a disease, provide the disease name and a brief recommendation. Return the response in strict JSON format like this: {\"status\": \"healthy\" | \"attention_needed\", \"disease\": \"disease name or none\", \"recommendation\": \"brief advice or none\", \"confidence\": 0.95}";
    
    $post_data = [
        "contents" => [
            [
                "parts" => [
                    ["text" => $prompt],
                    [
                        "inlineData" => [
                            "mimeType" => $mime_type,
                            "data" => $image_data
                        ]
                    ]
                ]
            ]
        ]
    ];
    
    $ch = curl_init($api_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($post_data));
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Fixes XAMPP SSL certificate issues
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $result_disease = "Unknown";
    $confidence = 0;
    $recommendation = "";
    $field_status = "unknown";
    
    if ($http_code == 200 && $response) {
        $gemini_response = json_decode($response, true);
        if (isset($gemini_response['candidates'][0]['content']['parts'][0]['text'])) {
            $text = $gemini_response['candidates'][0]['content']['parts'][0]['text'];
            
            // Clean up backticks if Gemini returned markdown json
            $text = str_replace(['```json', '```'], '', $text);
            $parsed_ai = json_decode(trim($text), true);
            
            if ($parsed_ai) {
                $field_status = $parsed_ai['status'] ?? 'unknown';
                $result_disease = $parsed_ai['disease'] ?? 'Unknown';
                $recommendation = $parsed_ai['recommendation'] ?? '';
                $confidence = isset($parsed_ai['confidence']) ? floatval($parsed_ai['confidence']) : 0;
            }
        }
    } else {
        // Log exact API error for debugging
        $curl_err = curl_error($ch);
        $recommendation = "Debug: HTTP $http_code. cURL Error: $curl_err. Response: " . substr($response, 0, 100);
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
