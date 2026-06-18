#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>

// ==========================================
// 1. YOUR MOBILE HOTSPOT CREDENTIALS
// ==========================================
const char* ssid = "Mi Note 10 Lite";
const char* password = "0123456789";

// 2. YOUR LAPTOP'S HOTSPOT IP ADDRESS
String serverName = "http://10.128.2.141/Agri-Guard/backend/upload_image.php";

// 3. THE FIELD ID THIS CAMERA IS MONITORING
String fieldId = "1"; 
// ==========================================

// CAMERA_MODEL_AI_THINKER Pins
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0  // CRITICAL: Cannot be used as a button!
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

void setup() {
  Serial.begin(115200);
  Serial.println("\n--- Booting Agri-Guard Node ---");

  // TURN OFF FLASH LED TO SAVE MASSIVE POWER (Prevents brownouts)
  pinMode(4, OUTPUT);
  digitalWrite(4, LOW);

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  
  // NUCLEAR HARDWARE FIX 1: Lower the clock speed from 20MHz to 10MHz
  // Cheap camera sensors cannot handle 20MHz and crash when capturing frames.
  config.xclk_freq_hz = 10000000;
  
  config.pixel_format = PIXFORMAT_JPEG;
  
  // INCREASED RESOLUTION: Now that PSRAM is working, we can take HD photos!
  config.frame_size = FRAMESIZE_SVGA; // 800x600 resolution
  config.jpeg_quality = 10; // Lower number = better quality (less compression)
  config.fb_count = 1;
  
  // CRITICAL FIX: Bypass the external PSRAM chip entirely!
  // This forces the image into the ESP32's internal memory.
  config.fb_location = CAMERA_FB_IN_DRAM;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    Serial.println("CRITICAL: Make sure the golden ribbon is pushed ALL the way in!");
    return;
  }
  Serial.println("Camera Memory Allocated.");
  
  // WARM UP SENSOR
  delay(2000); 

  // =========================================================
  // NUCLEAR HARDWARE FIX 3: TAKE PICTURE BEFORE WIFI TURNS ON!
  // This completely separates the Camera power spike from the Wi-Fi power spike.
  // =========================================================
  Serial.println("\nTaking picture BEFORE Wi-Fi turns on...");
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed!");
    return;
  }
  Serial.println("Picture captured successfully! Memory size: " + String(fb->len) + " bytes");

  // NOW CONNECT WIFI
  Serial.print("Connecting to WiFi");
  WiFi.setTxPower(WIFI_POWER_8_5dBm);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");

  // UPLOAD THE PICTURE
  sendPhoto(fb);
  
  // RETURN THE FRAME TO MEMORY
  esp_camera_fb_return(fb);
  
  Serial.println("\n✅ DONE! Please press the RST button to take another.");
}

void loop() {
  delay(1000);
}

void sendPhoto(camera_fb_t * fb) {
  Serial.println("Uploading to server...");
  
  WiFiClient client;
  const char* host = "10.128.2.141";
  const int port = 80;
  
  if (!client.connect(host, port)) {
    Serial.println("Connection to XAMPP server failed! Make sure your laptop firewall is off.");
    return;
  }

  String boundary = "----ESP32Boundary";
  String head = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"image\"; filename=\"esp32-cam.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n";
  String tail = "\r\n--" + boundary + "\r\nContent-Disposition: form-data; name=\"field_id\"\r\n\r\n" + fieldId + "\r\n--" + boundary + "--\r\n";

  uint32_t totalLen = head.length() + fb->len + tail.length();

  // Send HTTP Headers
  client.println("POST /Agri-Guard/backend/upload_image.php HTTP/1.1");
  client.println("Host: 10.128.2.141");
  client.println("Content-Type: multipart/form-data; boundary=" + boundary);
  client.println("Content-Length: " + String(totalLen));
  client.println(); // Empty line signifies end of headers
  
  // Send Payload
  client.print(head);
  client.write(fb->buf, fb->len);
  client.print(tail);

  // Wait for response
  int timeout = 10000;
  long start = millis();
  while (client.available() == 0) {
    if (millis() - start > timeout) {
      Serial.println("Server timed out!");
      client.stop();
      return;
    }
  }

  Serial.print("✅ Server Response: ");
  // Print exactly what the XAMPP server (and AI) replied with
  while(client.available()) {
    String line = client.readStringUntil('\r');
    if (line.indexOf("{") >= 0) { // Filter out raw HTTP headers and only show the JSON
      Serial.println(line);
    }
  }
  
  client.stop();
}
