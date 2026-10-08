/*
 * Agri-Guard — Arduino Uno Co-Processor Sketch
 * Handles:
 *   - Camera Tilt Servo (Pin 9)  ← 360-degree continuous rotation motor!
 *   - Soil Probe Servo (Pin 10)  ← Standard 180-degree servo
 *   - Soil Moisture Sensor (A0)
 *   - DS18B20 Temp Sensor (Pin 2)
 *   - HC-SR04 Ultrasonic (Trig 6, Echo 7)
 *   - Serial link from ESP32-CAM (RX 3, TX 4)
 */

#include <Servo.h>
#include <SoftwareSerial.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// Serial link: ESP32-CAM TX(IO2) -> Uno RX(3) | ESP32-CAM RX(IO3) -> Uno TX(4)
SoftwareSerial espSerial(3, 4);

Servo tiltServo;
Servo burrowServo;

// Pins
const int TEMP_PIN      = 2;
const int TILT_PIN      = 9;
const int BURROW_PIN    = 10;
const int MOISTURE_PIN  = A0;
const int TRIG_PIN      = 6;
const int ECHO_PIN      = 7;

// Temp Sensor Setup
OneWire oneWire(TEMP_PIN);
DallasTemperature tempSensor(&oneWire);

// ── TILT SERVO: 360-Degree Continuous Rotation ─────────────────────────────
// Separate counters so each direction is independently limited.
void moveTilt(int cmd) {
  if (cmd < 90) {
    // Nudge UP — bracket is the physical stop, totally safe
    tiltServo.attach(TILT_PIN);
    tiltServo.write(0);   // Spin UP
    delay(60);            // 60ms nudge
    tiltServo.detach();   // Cut power
  }
  else if (cmd > 90) {
    // Nudge DOWN — bracket is the physical stop, totally safe
    tiltServo.attach(TILT_PIN);
    tiltServo.write(180); // Spin DOWN
    delay(60);            // 60ms nudge
    tiltServo.detach();   // Cut power
  }
  else {
    tiltServo.detach();   // Startup: ensure motor is off
  }
}

// ── BURROW SERVO: Standard 180-Degree, STAYS ATTACHED ──────────────────────
void moveBurrow(int angle, int holdMs = 600) {
  angle = constrain(angle, 0, 180);
  burrowServo.write(angle);                 // 1. Tell it the angle FIRST
  if (!burrowServo.attached()) {
    burrowServo.attach(BURROW_PIN);         // 2. Turn the pin on SECOND
  }
  delay(holdMs);
  // DO NOT detach — keep holding against gravity!
}

void setup() {
  Serial.begin(115200);
  espSerial.begin(9600);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  tempSensor.begin();

  delay(1500); // Let power stabilize

  // Ensure camera motor is off on startup (does not move)
  moveTilt(90);

  // Hold burrow arm at resting position (stays attached!)
  moveBurrow(150, 800);

  Serial.println("Agri-Guard Arduino: All Sensors Ready!");
}

void loop() {
  if (espSerial.available() > 0) {
    String command = espSerial.readStringUntil('\n');
    command.trim();

    Serial.print("[CMD Received] ");
    Serial.println(command);

    // ── 1. SOIL MOISTURE ───────────────────────────────────────────────────
    if (command == "READ_MOISTURE") {
      moveBurrow(60, 1500);     // Arm DOWN into soil
      delay(1000);              // Let sensor settle

      long total = 0;
      for (int i = 0; i < 5; i++) {
        total += analogRead(MOISTURE_PIN);
        delay(50);
      }
      int rawVal = (int)(total / 5);

      moveBurrow(150, 1500);    // Arm back UP (stays held!)
      espSerial.println(rawVal);
      Serial.print("[Moisture] Sent ADC: ");
      Serial.println(rawVal);
    }

    // ── 2. CAMERA TILT ─────────────────────────────────────────────────────
    else if (command.startsWith("TILT:")) {
      int angle = command.substring(5).toInt();
      moveTilt(angle);
    }

    // ── 3. TEMPERATURE ─────────────────────────────────────────────────────
    else if (command == "READ_TEMP") {
      tempSensor.requestTemperatures();
      float tempC = tempSensor.getTempCByIndex(0);
      espSerial.println(tempC);
      Serial.print("[Temp] Sent C: ");
      Serial.println(tempC);
    }

    // ── 4. ULTRASONIC DISTANCE ─────────────────────────────────────────────
    else if (command == "READ_DISTANCE") {
      digitalWrite(TRIG_PIN, LOW);
      delayMicroseconds(2);
      digitalWrite(TRIG_PIN, HIGH);
      delayMicroseconds(10);
      digitalWrite(TRIG_PIN, LOW);
      long duration = pulseIn(ECHO_PIN, HIGH, 30000);
      int distance = duration * 0.034 / 2;
      if (distance == 0) distance = 999;
      espSerial.println(distance);
      Serial.print("[Distance] Sent cm: ");
      Serial.println(distance);
    }
  }
}