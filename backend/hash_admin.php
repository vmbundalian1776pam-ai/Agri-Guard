<?php
include 'db_connect.php';
$hash = password_hash('admin123', PASSWORD_DEFAULT);
$conn->query("UPDATE users SET password = '$hash' WHERE username = 'admin'");
echo "Admin password hashed!\n";
?>
