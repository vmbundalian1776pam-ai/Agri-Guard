#include <WiFi.h>
#include <WebServer.h>

// --- SETTINGS ---
// Replace these with the exact same Wi-Fi you use for your Rover and Laptop
const char* ssid = "HUAWEI-2.4G-b6Ht";
const char* password = "HpzB6x9Z";

// The pin you connected to the Relay 'IN' (G13)
const int RELAY_PIN = 13;

// Create a web server listening on port 80
WebServer server(80);

void setup() {
  Serial.begin(115200);
  
  // Standard Active-High logic (after moving the jumper to H)
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // LOW = Pump OFF

  // Connect to Wi-Fi
  Serial.println();
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi connected!");
  Serial.print("Watering System IP Address: ");
  Serial.println(WiFi.localIP());

  // Define what happens when the app sends commands
  server.on("/water_on", []() {
    digitalWrite(RELAY_PIN, HIGH); // Send 3.3V -> Pump ON
    server.send(200, "application/json", "{\"status\":\"success\", \"state\":\"on\"}");
    Serial.println("Pump turned ON");
  });

  server.on("/water_off", []() {
    digitalWrite(RELAY_PIN, LOW); // Send 0V -> Pump OFF
    server.send(200, "application/json", "{\"status\":\"success\", \"state\":\"off\"}");
    Serial.println("Pump turned OFF");
  });

  // Start the server
  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  // Listen for incoming app commands
  server.handleClient();
}
