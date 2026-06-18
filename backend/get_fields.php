<?php
header("Content-Type: application/json");
require_once "db_connect.php";

$sql = "SELECT * FROM fields ORDER BY name ASC";
$result = $conn->query($sql);

$fields = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $fields[] = $row;
    }
}

echo json_encode(["status" => "success", "data" => $fields]);
$conn->close();
?>
