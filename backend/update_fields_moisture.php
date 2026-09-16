<?php
require_once "db_connect.php";
$conn->query("ALTER TABLE fields ADD COLUMN IF NOT EXISTS last_moisture INT DEFAULT NULL, ADD COLUMN IF NOT EXISTS moisture_status VARCHAR(50) DEFAULT \"unknown\";");
echo "Done";
?>
