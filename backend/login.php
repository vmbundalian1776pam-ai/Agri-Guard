<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
include 'db_connect.php';

if (isset($_GET['username']) && isset($_GET['password'])) {
    $username = $_GET['username'];
    $password = $_GET['password'];

    $stmt = $conn->prepare("SELECT id, username, password, role FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        // Verify hashed password or plain text fallback (for testing)
        if (password_verify($password, $row['password']) || $password === $row['password']) {
            // Insert audit log (wrapped safely — won't break login if table missing)
            try {
                $log_stmt = $conn->prepare("INSERT INTO audit_logs (user_id, action) VALUES (?, 'login')");
                if ($log_stmt) {
                    $log_stmt->bind_param("i", $row['id']);
                    $log_stmt->execute();
                }
            } catch (Exception $e) { /* ignore */ }

            echo json_encode([
                "status" => "success",
                "user" => [
                    "id" => $row['id'],
                    "username" => $row['username'],
                    "role" => $row['role']
                ]
            ]);
        } else {
            echo json_encode(["status" => "error", "message" => "Invalid password"]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "User not found"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Username and password required"]);
}
?>
