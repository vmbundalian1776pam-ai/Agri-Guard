# 🌿 Agri-Guard: Smart Crop Disease Detection & Rover System

Agri-Guard is an integrated agricultural monitoring system that combines an autonomous/remote-controlled ESP32-CAM Rover, a custom Convolutional Neural Network (CNN) plant disease detection model, a PHP/MySQL backend, and a cross-platform React Native (Expo) mobile dashboard.

---

## 🏗️ System Architecture

```
[ ESP32-CAM Rover / Camera Node ]
         │ (MJPEG Stream & HTTP Capture)
         ▼
[ PHP / MySQL Backend (XAMPP) ] ── (POST image) ──► [ Python AI Server (Flask + TensorFlow) ]
         ▲                                                     │ (JSON Prediction)
         │ (REST API)                                         ▼
[ React Native Mobile App (Expo) ] ◄──────────────────────────┘
```

---

## 🚀 Setup & Installation Guide

### 1. 🗄️ Database Setup (MySQL / phpMyAdmin)
1. Start **Apache** and **MySQL** in your XAMPP Control Panel.
2. Open [http://localhost/phpmyadmin](http://localhost/phpmyadmin) in your browser.
3. Create a new database named `agri_guard_db`.
4. Click the **Import** tab, select `backend/database.sql`, and click **Go**.
5. The backend code in `backend/` will now automatically connect to this database via `backend/db_connect.php`.

---

### 2. 🧠 Python AI Server & Pre-trained Model
The project comes with a pre-trained Kaggle transfer-learning model (`plant_disease_model.h5`) for eggplant disease classification (Wilt, White Mold, Healthy, Leaf Spot, etc.).

1. Navigate to the AI server directory:
   ```bash
   cd backend/ai_server
   ```
2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the local AI prediction server:
   ```bash
   python app.py
   ```
   *The server runs locally on `http://127.0.0.1:5000`.*

#### 📁 How Datasets Work (Optional Retraining):
- Raw training images are kept out of GitHub to keep the repository lightweight.
- If you want to retrain the model with a new Kaggle dataset, place your disease image folders inside `backend/ai_server/dataset/` (e.g. `dataset/Healthy/`, `dataset/Wilt/`) and run:
  ```bash
  python train.py
  ```

---

### 3. 📱 Mobile App (React Native / Expo)
1. Navigate to the mobile app folder:
   ```bash
   cd agri-guard-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update the API address in `agri-guard-app/config.ts`:
   - Set `API_BASE_URL` to your computer's local Wi-Fi IP address (e.g., `http://192.168.1.X/Agri-Guard/backend`).
4. Start the app:
   ```bash
   npx expo start --tunnel
   ```
5. Scan the QR code using the **Expo Go** app on iOS or Android.

---

### 4. 🤖 ESP32 Rover Integration
1. Open the rover code in Arduino IDE (`ESP32_Camera_4WD_Robot_Car_OV3660_V3`).
2. Update the Wi-Fi credentials to match your local network/hotspot.
3. Flash the code to the ESP32-CAM board.
4. Note the Rover's IP address from the Serial Monitor (e.g. `192.168.100.177`).
5. Open the **Rover** tab in the mobile app, enter the IP, and tap **Connect** to drive and perform live crop scans!

---

## 👥 Contributors & Defense Info
- **Project**: Agri-Guard Agricultural AI Monitoring System
- **Focus**: Eggplant Disease Classification & Smart Farm Robotics
