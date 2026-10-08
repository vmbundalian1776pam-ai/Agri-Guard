import psycopg2
import sys

db_url = "postgresql://postgres:Bundalian2309_@db.bvczwcpjjcwymgkwywgb.supabase.co:5432/postgres"

print("Connecting to Supabase...")
conn = psycopg2.connect(db_url, sslmode='require')
cur = conn.cursor()

print("Cleaning existing tables...")
cur.execute("TRUNCATE TABLE audit_logs, scans, fields, users RESTART IDENTITY CASCADE;")

print("Inserting fields...")
cur.execute("""
INSERT INTO fields (id, name, location, status, created_at) VALUES
(1, 'Eggplant Field', 'Main Zone', 'healthy', '2026-08-14 11:24:13');
""")

print("Inserting users (passwords reset to plain text for Python compatibility)...")
cur.execute("""
INSERT INTO users (id, username, password, role, created_at) VALUES
(1, 'admin', 'admin123', 'owner', '2026-08-24 11:55:58'),
(2, 'Farmer1', 'farmer123', 'farmer', '2026-08-24 12:26:05'),
(3, 'Farmer2', 'farmer123', 'farmer', '2026-08-27 02:02:35');
""")

print("Inserting scans...")
cur.execute("""
INSERT INTO scans (id, field_id, image_path, result_disease, confidence, recommendation, created_at) VALUES
(5, 1, 'uploads/rover_6a82f00981aaf.jpg', 'Wilt Disease', '95.00', 'Disease detected. Please isolate the plant, remove heavily affected areas, and consult a local agricultural extension for specific treatments.', '2026-08-17 11:27:06'),
(6, 1, 'uploads/rover_6a82f1a6e2815.jpg', 'Wilt Disease', '95.00', 'Disease detected. Please isolate the plant, remove heavily affected areas, and consult a local agricultural extension for specific treatments.', '2026-08-17 11:33:59'),
(7, 1, 'uploads/rover_6a82f1efa3da8.jpg', 'Healthy Leaf', '74.00', 'The plant looks healthy! Keep up the good work with watering and sunlight.', '2026-08-17 11:35:11'),
(8, 1, 'uploads/rover_6a82f2445e307.jpg', 'White Mold Disease', '35.00', 'Disease detected. Please isolate the plant, remove heavily affected areas, and consult a local agricultural extension for specific treatments.', '2026-08-17 11:36:36'),
(9, 1, 'uploads/rover_6a82f4313b65c.jpg', 'Mosaic Virus Disease', '87.83', 'Disease detected. Please isolate the plant, remove heavily affected areas, and consult a local agricultural extension for specific treatments.', '2026-08-17 11:44:49'),
(10, 1, 'uploads/rover_6a82f46fd9fd0.jpg', 'Mosaic Virus Disease', '62.66', 'Disease detected. Please isolate the plant, remove heavily affected areas, and consult a local agricultural extension for specific treatments.', '2026-08-17 11:45:51'),
(11, 1, 'uploads/rover_6a856b64334ce.jpg', 'Wilt Disease', '99.89', 'Wilt disease detected (bacterial or fungal vascular blockage). Remove wilted plants along with root soil to prevent spread. Ensure proper field drainage, avoid over-irrigation, and treat root zones with copper oxychloride.', '2026-08-19 08:37:57'),
(12, 1, 'uploads/rover_6a856b7d89941.jpg', 'Wilt Disease', '97.31', 'Wilt disease detected (bacterial or fungal vascular blockage). Remove wilted plants along with root soil to prevent spread. Ensure proper field drainage, avoid over-irrigation, and treat root zones with copper oxychloride.', '2026-08-19 08:38:21'),
(13, 1, 'uploads/rover_6a856bbbe55d1.jpg', 'Wilt Disease', '86.26', 'Wilt disease detected (bacterial or fungal vascular blockage). Remove wilted plants along with root soil to prevent spread. Ensure proper field drainage, avoid over-irrigation, and treat root zones with copper oxychloride.', '2026-08-19 08:39:24'),
(14, 1, 'uploads/rover_6a856bd48b7e4.jpg', 'Wilt Disease', '87.11', 'Wilt disease detected (bacterial or fungal vascular blockage). Remove wilted plants along with root soil to prevent spread. Ensure proper field drainage, avoid over-irrigation, and treat root zones with copper oxychloride.', '2026-08-19 08:39:48'),
(15, 1, 'uploads/rover_6a856bf441daa.jpg', 'Small Leaf Disease', '47.27', 'Little Leaf Disease detected (caused by phytoplasma). Uproot and discard severely stunted plants. Control leafhopper insect vectors by applying systemic insecticides (like Dimethoate) or neem-based sprays.', '2026-08-19 08:40:20'),
(16, 1, 'uploads/rover_6a856c25395db.jpg', 'Healthy Leaf', '48.44', 'Plant is healthy and showing vigorous foliage. Maintain regular drip irrigation, monitor soil moisture, and continue routine weed and nutrient management.', '2026-08-19 08:41:09'),
(17, 1, 'uploads/rover_6a856c2e1a894.jpg', 'Healthy Leaf', '55.72', 'Plant is healthy and showing vigorous foliage. Maintain regular drip irrigation, monitor soil moisture, and continue routine weed and nutrient management.', '2026-08-19 08:41:18'),
(18, 1, 'uploads/rover_6a856c491cf63.jpg', 'Insect Pest Disease', '57.02', 'Insect pest damage detected (e.g., shoot borers, aphids, or flea beetles). Prune and destroy infested shoots. Spray organic neem oil (2-3%) or use recommended biological insecticides (e.g., Bacillus thuringiensis) early in the morning.', '2026-08-19 08:41:45'),
(19, 1, 'uploads/rover_6a856cf194851.jpg', 'Wilt Disease', '75.05', 'Wilt disease detected (bacterial or fungal vascular blockage). Remove wilted plants along with root soil to prevent spread. Ensure proper field drainage, avoid over-irrigation, and treat root zones with copper oxychloride.', '2026-08-19 08:44:33'),
(20, 1, 'uploads/rover_6a85702192a1b.jpg', 'Mosaic Virus Disease', '95.85', 'Mosaic virus detected. Viruses cannot be cured once inside the plant. Remove and safely dispose of infected plants immediately. Control sap-sucking insect vectors (aphids/whiteflies) using yellow sticky traps or insecticidal soap.', '2026-08-19 08:58:10'),
(21, 1, 'uploads/rover_6a85706f5b032.jpg', 'Mosaic Virus Disease', '97.11', 'Mosaic virus detected. Viruses cannot be cured once inside the plant. Remove and safely dispose of infected plants immediately. Control sap-sucking insect vectors (aphids/whiteflies) using yellow sticky traps or insecticidal soap.', '2026-08-19 08:59:27'),
(22, 1, 'uploads/rover_6a857081cab40.jpg', 'Mosaic Virus Disease', '92.72', 'Mosaic virus detected. Viruses cannot be cured once inside the plant. Remove and safely dispose of infected plants immediately. Control sap-sucking insect vectors (aphids/whiteflies) using yellow sticky traps or insecticidal soap.', '2026-08-19 08:59:45'),
(23, 1, 'uploads/rover_6a8570bcc956a.jpg', 'Mosaic Virus Disease', '76.38', 'Mosaic virus detected. Viruses cannot be cured once inside the plant. Remove and safely dispose of infected plants immediately. Control sap-sucking insect vectors (aphids/whiteflies) using yellow sticky traps or insecticidal soap.', '2026-08-19 09:00:44'),
(24, 1, 'uploads/rover_6a8570cb153c1.jpg', 'Healthy Leaf', '99.86', 'Plant is healthy and showing vigorous foliage. Maintain regular drip irrigation, monitor soil moisture, and continue routine weed and nutrient management.', '2026-08-19 09:00:59'),
(25, 1, 'uploads/rover_6a8570e017c1a.jpg', 'Healthy Leaf', '99.79', 'Plant is healthy and showing vigorous foliage. Maintain regular drip irrigation, monitor soil moisture, and continue routine weed and nutrient management.', '2026-08-19 09:01:20'),
(26, 1, 'uploads/rover_6a8571094e290.jpg', 'Mosaic Virus Disease', '97.19', 'Mosaic virus detected. Viruses cannot be cured once inside the plant. Remove and safely dispose of infected plants immediately. Control sap-sucking insect vectors (aphids/whiteflies) using yellow sticky traps or insecticidal soap.', '2026-08-19 09:02:01'),
(27, 1, 'uploads/rover_6a857121230c5.jpg', 'Mosaic Virus Disease', '63.61', 'Mosaic virus detected. Viruses cannot be cured once inside the plant. Remove and safely dispose of infected plants immediately. Control sap-sucking insect vectors (aphids/whiteflies) using yellow sticky traps or insecticidal soap.', '2026-08-19 09:02:25'),
(28, 1, 'uploads/rover_6a857137c05bc.jpg', 'Insect Pest Disease', '56.66', 'Insect pest damage detected (e.g., shoot borers, aphids, or flea beetles). Prune and destroy infested shoots. Spray organic neem oil (2-3%) or use recommended biological insecticides (e.g., Bacillus thuringiensis) early in the morning.', '2026-08-19 09:02:47'),
(29, 1, 'uploads/rover_6a8ee2a38e6eb.jpg', 'Unknown', '0.00', 'AI Server is not running. Make sure app.py is running on port 5000.', '2026-08-26 12:57:09'),
(30, 1, 'uploads/rover_6a8ee4db92aa6.jpg', 'Unknown', '0.00', 'AI Server is not running. Make sure app.py is running on port 5000.', '2026-08-26 13:06:37'),
(31, 1, 'uploads/rover_6a8f9b9b55bc6.jpg', 'Healthy Leaf', '74.14', 'Plant is healthy and showing vigorous foliage. Maintain regular drip irrigation, monitor soil moisture, and continue routine weed and nutrient management.', '2026-08-27 02:06:20'),
(32, 1, 'uploads/rover_6a8f9d225631d.jpg', 'Not a Plant / Unrecognized', '27.68', 'The AI could not confidently identify a crop in this image. Please ensure the rover camera is clearly pointed at a plant leaf and try scanning again.', '2026-08-27 02:12:51'),
(33, 1, 'uploads/rover_6a8f9d2cd42dd.jpg', 'Mosaic Virus Disease', '91.08', 'Mosaic virus detected. Viruses cannot be cured once inside the plant. Remove and safely dispose of infected plants immediately. Control sap-sucking insect vectors (aphids/whiteflies) using yellow sticky traps or insecticidal soap.', '2026-08-27 02:13:00'),
(34, 1, 'uploads/rover_6a8f9d38822e8.jpg', 'Mosaic Virus Disease', '98.61', 'Mosaic virus detected. Viruses cannot be cured once inside the plant. Remove and safely dispose of infected plants immediately. Control sap-sucking insect vectors (aphids/whiteflies) using yellow sticky traps or insecticidal soap.', '2026-08-27 02:13:12'),
(35, 1, 'uploads/rover_6a8f9e298c208.jpg', 'Not a Plant / Unrecognized', '0.00', 'AI Rejected: The camera did not detect enough plant colors (green, yellow, or brown). Please ensure a crop leaf is clearly in the frame.', '2026-08-27 02:17:13'),
(36, 1, 'uploads/rover_6a8f9e7116f21.jpg', 'Small Leaf Disease', '78.41', 'Little Leaf Disease detected (caused by phytoplasma). Uproot and discard severely stunted plants. Control leafhopper insect vectors by applying systemic insecticides (like Dimethoate) or neem-based sprays.', '2026-08-27 02:18:25'),
(37, 1, 'uploads/rover_6a8f9e979a119.jpg', 'Small Leaf Disease', '100.00', 'Little Leaf Disease detected (caused by phytoplasma). Uproot and discard severely stunted plants. Control leafhopper insect vectors by applying systemic insecticides (like Dimethoate) or neem-based sprays.', '2026-08-27 02:19:03'),
(38, 1, 'uploads/rover_6a8f9ec8db4d3.jpg', 'Healthy Leaf', '97.34', 'Plant is healthy and showing vigorous foliage. Maintain regular drip irrigation, monitor soil moisture, and continue routine weed and nutrient management.', '2026-08-27 02:19:53'),
(39, 1, 'uploads/rover_6a8f9ed3554c1.jpg', 'Healthy Leaf', '83.29', 'Plant is healthy and showing vigorous foliage. Maintain regular drip irrigation, monitor soil moisture, and continue routine weed and nutrient management.', '2026-08-27 02:20:03'),
(40, 1, 'uploads/rover_6a8f9f0c2417a.jpg', 'Healthy Leaf', '99.22', 'Plant is healthy and showing vigorous foliage. Maintain regular drip irrigation, monitor soil moisture, and continue routine weed and nutrient management.', '2026-08-27 02:21:00'),
(41, 1, 'uploads/rover_6a8f9f2d71b4d.jpg', 'Not a Plant / Unrecognized', '50.53', 'The AI could not confidently identify a crop in this image. Please ensure the rover camera is clearly pointed at a plant leaf and try scanning again.', '2026-08-27 02:21:33'),
(42, 1, 'uploads/rover_6a8f9f35b69cb.jpg', 'Not a Plant / Unrecognized', '63.90', 'The AI could not confidently identify a crop in this image. Please ensure the rover camera is clearly pointed at a plant leaf and try scanning again.', '2026-08-27 02:21:41'),
(43, 1, 'uploads/rover_6a8f9f4531499.jpg', 'Mosaic Virus Disease', '98.58', 'Mosaic virus detected. Viruses cannot be cured once inside the plant. Remove and safely dispose of infected plants immediately. Control sap-sucking insect vectors (aphids/whiteflies) using yellow sticky traps or insecticidal soap.', '2026-08-27 02:21:57'),
(44, 1, 'uploads/rover_6a8f9f57395ee.jpg', 'Healthy Leaf', '99.94', 'Plant is healthy and showing vigorous foliage. Maintain regular drip irrigation, monitor soil moisture, and continue routine weed and nutrient management.', '2026-08-27 02:22:15'),
(45, 1, 'uploads/rover_6a8fb5bc0fcd8.jpg', 'Not a Plant / Unrecognized', '32.63', 'The AI could not confidently identify a crop in this image. Please ensure the rover camera is clearly pointed at a plant leaf and try scanning again.', '2026-08-27 03:57:48'),
(46, 1, 'uploads/rover_6a8fb5cbdedf3.jpg', 'Healthy Leaf', '99.38', 'Plant is healthy and showing vigorous foliage. Maintain regular drip irrigation, monitor soil moisture, and continue routine weed and nutrient management.', '2026-08-27 03:58:04'),
(47, 1, 'uploads/rover_6a8fb5d410325.jpg', 'Healthy Leaf', '97.64', 'Plant is healthy and showing vigorous foliage. Maintain regular drip irrigation, monitor soil moisture, and continue routine weed and nutrient management.', '2026-08-27 03:58:12'),
(48, 1, 'uploads/rover_6a8fb5d94e56a.jpg', 'Not a Plant / Unrecognized', '64.54', 'The AI could not confidently identify a crop in this image. Please ensure the rover camera is clearly pointed at a plant leaf and try scanning again.', '2026-08-27 03:58:17'),
(49, 1, 'uploads/rover_6a8fb61439b5c.jpg', 'Healthy Leaf', '77.08', 'Plant is healthy and showing vigorous foliage. Maintain regular drip irrigation, monitor soil moisture, and continue routine weed and nutrient management.', '2026-08-27 03:59:16'),
(50, 1, 'uploads/rover_6a8fb696a86ca.jpg', 'Healthy Leaf', '95.85', 'Plant is healthy and showing vigorous foliage. Maintain regular drip irrigation, monitor soil moisture, and continue routine weed and nutrient management.', '2026-08-27 04:01:26'),
(51, 1, 'uploads/rover_6a8fb77f1e840.jpg', 'Not a Plant / Unrecognized', '70.16', 'The AI could not confidently identify a crop in this image. Please ensure the rover camera is clearly pointed at a plant leaf and try scanning again.', '2026-08-27 04:05:19'),
(52, 1, 'uploads/rover_6a8fb79564faf.jpg', 'Not a Plant / Unrecognized', '48.81', 'The AI could not confidently identify a crop in this image. Please ensure the rover camera is clearly pointed at a plant leaf and try scanning again.', '2026-08-27 04:05:41'),
(53, 1, 'uploads/rover_6a8fb7a2cff12.jpg', 'Healthy Leaf', '94.38', 'Plant is healthy and showing vigorous foliage. Maintain regular drip irrigation, monitor soil moisture, and continue routine weed and nutrient management.', '2026-08-27 04:05:54'),
(54, 1, 'uploads/rover_6a8fb800c9b34.jpg', 'Healthy Leaf', '84.45', 'Plant is healthy and showing vigorous foliage. Maintain regular drip irrigation, monitor soil moisture, and continue routine weed and nutrient management.', '2026-08-27 04:07:28'),
(55, 1, 'uploads/rover_6a8fb821cde65.jpg', 'Mosaic Virus Disease', '96.07', 'Mosaic virus detected. Viruses cannot be cured once inside the plant. Remove and safely dispose of infected plants immediately. Control sap-sucking insect vectors (aphids/whiteflies) using yellow sticky traps or insecticidal soap.', '2026-08-27 04:08:01'),
(56, 1, 'uploads/rover_6a8fb847547b9.jpg', 'Mosaic Virus Disease', '96.74', 'Mosaic virus detected. Viruses cannot be cured once inside the plant. Remove and safely dispose of infected plants immediately. Control sap-sucking insect vectors (aphids/whiteflies) using yellow sticky traps or insecticidal soap.', '2026-08-27 04:08:39'),
(57, 1, 'uploads/rover_6a8fb85767f54.jpg', 'Healthy Leaf', '99.82', 'Plant is healthy and showing vigorous foliage. Maintain regular drip irrigation, monitor soil moisture, and continue routine weed and nutrient management.', '2026-08-27 04:08:55'),
(58, 1, 'uploads/rover_6a8fb870adae4.jpg', 'Not a Plant / Unrecognized', '48.84', 'The AI could not confidently identify a crop in this image. Please ensure the rover camera is clearly pointed at a plant leaf and try scanning again.', '2026-08-27 04:09:20'),
(59, 1, 'uploads/rover_6a8fb8796956a.jpg', 'Healthy Leaf', '80.08', 'Plant is healthy and showing vigorous foliage. Maintain regular drip irrigation, monitor soil moisture, and continue routine weed and nutrient management.', '2026-08-27 04:09:29'),
(60, 1, 'uploads/rover_6a8fbd6762ab5.jpg', 'Healthy Leaf', '96.95', 'Plant is healthy and showing vigorous foliage. Maintain regular drip irrigation, monitor soil moisture, and continue routine weed and nutrient management.', '2026-08-27 04:30:31'),
(61, 1, 'uploads/rover_6a8fbd83a699e.jpg', 'Not a Plant / Unrecognized', '39.52', 'The AI could not confidently identify a crop in this image. Please ensure the rover camera is clearly pointed at a plant leaf and try scanning again.', '2026-08-27 04:30:59'),
(62, 1, 'uploads/rover_6a9d096f80e53.jpg', 'Not a Plant / Unrecognized', '52.42', 'The AI could not confidently identify a crop in this image. Please ensure the rover camera is clearly pointed at a plant leaf and try scanning again.', '2026-09-06 06:34:24'),
(63, 1, 'uploads/rover_6aa7fc170320c.jpg', 'Unknown', '0.00', 'AI Server is not running. Make sure app.py is running on port 5000.', '2026-09-14 13:52:25'),
(64, 1, 'uploads/rover_6aa7fc42dc6d9.jpg', 'Not a Plant / Unrecognized', '74.84', 'The AI could not confidently identify a crop in this image. Please ensure the rover camera is clearly pointed at a plant leaf and try scanning again.', '2026-09-14 13:53:07'),
(65, 1, 'uploads/rover_6aa7fc6a5ca7f.jpg', 'Leaf Spot Disease', '99.21', 'Fungal leaf spot detected (Cercospora/Alternaria). Remove infected lower leaves to prevent spore splash. Avoid overhead watering to keep foliage dry, and apply a copper-based or Mancozeb fungicide.', '2026-09-14 13:53:46'),
(66, 1, 'uploads/rover_6aa7fc7c4e387.jpg', 'Not a Plant / Unrecognized', '65.96', 'The AI could not confidently identify a crop in this image. Please ensure the rover camera is clearly pointed at a plant leaf and try scanning again.', '2026-09-14 13:54:04'),
(67, 1, 'uploads/rover_6aa7fc8e634f8.jpg', 'Small Leaf Disease', '79.82', 'Little Leaf Disease detected (caused by phytoplasma). Uproot and discard severely stunted plants. Control leafhopper insect vectors by applying systemic insecticides (like Dimethoate) or neem-based sprays.', '2026-09-14 13:54:22'),
(68, 1, 'uploads/rover_6aa7fc9dd7946.jpg', 'Leaf Spot Disease', '89.73', 'Fungal leaf spot detected (Cercospora/Alternaria). Remove infected lower leaves to prevent spore splash. Avoid overhead watering to keep foliage dry, and apply a copper-based or Mancozeb fungicide.', '2026-09-14 13:54:38'),
(69, 1, 'uploads/rover_6aa7fcba99190.jpg', 'Healthy Leaf', '93.90', 'Plant is healthy and showing vigorous foliage. Maintain regular drip irrigation, monitor soil moisture, and continue routine weed and nutrient management.', '2026-09-14 13:55:06');
""")

print("Inserting audit logs...")
cur.execute("""
INSERT INTO audit_logs (id, user_id, action, created_at) VALUES
(1, 2, 'login', '2026-09-14 14:41:50'),
(2, 2, 'logout', '2026-09-14 14:42:04'),
(3, 1, 'login', '2026-09-14 14:42:13'),
(4, 1, 'login', '2026-09-15 13:38:22'),
(5, 1, 'login', '2026-09-15 13:41:21'),
(6, 1, 'login', '2026-09-15 14:05:48'),
(7, 1, 'login', '2026-09-16 06:32:05'),
(8, 1, 'login', '2026-09-16 06:55:06'),
(9, 1, 'login', '2026-09-16 06:55:34'),
(10, 1, 'login', '2026-09-16 07:06:26'),
(11, 1, 'login', '2026-09-16 07:09:31'),
(12, 1, 'login', '2026-09-16 07:30:15'),
(13, 1, 'login', '2026-09-16 08:07:36'),
(14, 1, 'login', '2026-09-16 08:29:16'),
(15, 1, 'login', '2026-09-16 09:00:07'),
(16, 1, 'login', '2026-09-16 09:13:13'),
(17, 1, 'login', '2026-09-16 09:23:37'),
(18, 1, 'login', '2026-09-16 10:16:44'),
(19, 2, 'login', '2026-09-16 12:20:22'),
(20, 2, 'logout', '2026-09-16 12:20:56'),
(21, 1, 'login', '2026-09-16 12:21:03'),
(22, 1, 'login', '2026-09-16 13:06:45'),
(23, 1, 'login', '2026-09-28 11:46:03'),
(24, 1, 'login', '2026-09-28 12:19:51'),
(25, 1, 'login', '2026-09-28 12:26:51'),
(26, 1, 'login', '2026-09-28 12:54:23'),
(27, 1, 'login', '2026-09-28 13:13:48'),
(28, 1, 'login', '2026-09-28 15:59:17'),
(29, 1, 'login', '2026-09-28 16:11:05'),
(30, 1, 'login', '2026-09-28 16:20:12'),
(31, 1, 'login', '2026-09-28 16:33:21'),
(32, 1, 'login', '2026-09-28 16:45:58'),
(33, 1, 'login', '2026-09-29 13:09:22'),
(34, 1, 'login', '2026-09-29 13:27:29'),
(35, 1, 'login', '2026-09-29 13:45:12'),
(36, 1, 'login', '2026-09-29 13:52:59'),
(37, 1, 'login', '2026-09-29 14:15:43'),
(38, 1, 'login', '2026-09-29 14:47:55'),
(39, 1, 'login', '2026-09-29 14:54:55'),
(40, 1, 'login', '2026-09-29 17:18:35'),
(41, 1, 'login', '2026-09-29 17:45:54'),
(42, 1, 'login', '2026-09-29 17:47:24'),
(43, 1, 'login', '2026-09-29 17:49:43'),
(44, 1, 'login', '2026-09-29 17:55:29'),
(45, 1, 'login', '2026-09-29 18:03:55'),
(46, 1, 'login', '2026-09-29 18:07:37'),
(47, 1, 'login', '2026-09-29 18:11:36'),
(48, 1, 'login', '2026-09-29 18:12:56'),
(49, 1, 'login', '2026-09-29 18:21:31'),
(50, 1, 'login', '2026-09-29 18:31:15');
""")

print("Resetting sequences...")
cur.execute("SELECT setval('audit_logs_id_seq', (SELECT MAX(id) FROM audit_logs));")
cur.execute("SELECT setval('fields_id_seq', (SELECT MAX(id) FROM fields));")
cur.execute("SELECT setval('scans_id_seq', (SELECT MAX(id) FROM scans));")
cur.execute("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));")

conn.commit()
cur.close()
conn.close()
print("SUCCESS! Data migrated.")
