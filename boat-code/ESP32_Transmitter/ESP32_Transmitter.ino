#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <SPI.h>
#include <LoRa.h>
#include <math.h>

#define DEMO_MODE false

// LoRa Pins
#define SS    5
#define RST   14
#define DIO0  2

// Alerts
#define LED_PIN    4
#define BUZZER_PIN 15

const float DANGER_KM  = 10.0;
const float WARNING_KM = 20.0;

// Boundary
float boundaryLats[] = {9.50, 9.70, 9.95, 10.15, 10.35};
float boundaryLons[] = {80.30, 80.20, 80.10, 79.95, 79.80};
int numPoints = 5;

// Simulation
float simLats[] = {9.15,9.18,9.21,9.24,9.28,9.33,9.35,9.37,9.38,9.40,9.42,9.44,9.46,9.48,9.50};
float simLons[] = {80.30,80.30,80.30,80.30,80.30,80.30,80.30,80.30,80.30,80.30,80.30,80.30,80.30,80.30,80.30};
int simStep = 0;

TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

// Distance
float haversineDistance(float lat1, float lon1, float lat2, float lon2) {
  const float R = 6371.0;
  float dLat = radians(lat2 - lat1);
  float dLon = radians(lon2 - lon1);
  float a = sin(dLat/2)*sin(dLat/2) +
            cos(radians(lat1)) * cos(radians(lat2)) *
            sin(dLon/2)*sin(dLon/2);
  return R * 2 * atan2(sqrt(a), sqrt(1-a));
}

float distanceToBoundary(float curLat, float curLon) {
  float minDist = 99999.0;
  for (int i = 0; i < numPoints; i++) {
    float d = haversineDistance(curLat, curLon, boundaryLats[i], boundaryLons[i]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

// Alert
void updateAlert(float dist) {
  if (dist > WARNING_KM) {
    digitalWrite(LED_PIN, LOW);
    noTone(BUZZER_PIN);
  } else if (dist > DANGER_KM) {
    digitalWrite(LED_PIN, (millis()/500)%2);
    noTone(BUZZER_PIN);
  } else {
    digitalWrite(LED_PIN, HIGH);
    tone(BUZZER_PIN, 1000);
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);

  LoRa.setPins(SS, RST, DIO0);

  if (!LoRa.begin(433E6)) {
    Serial.println("LoRa init failed!");
    while (1);
  }

  // ✅ Stable config
  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  LoRa.setSyncWord(0xF3);
  LoRa.enableCrc();

  Serial.println("🚤 Boat Ready");
}

void loop() {
  float lat, lon;

  if (DEMO_MODE) {
    lat = simLats[simStep];
    lon = simLons[simStep];
    simStep = (simStep + 1) % 15;
  } else {
    while (gpsSerial.available()) gps.encode(gpsSerial.read());

    if (!gps.location.isValid()) {
      Serial.println("Waiting GPS...");
      delay(2000);
      return;
    }

    lat = gps.location.lat();
    lon = gps.location.lng();
  }

  float dist = distanceToBoundary(lat, lon);
  updateAlert(dist);

  String zone = (dist > WARNING_KM) ? "SAFE" :
                (dist > DANGER_KM) ? "WARNING" : "DANGER";

  Serial.printf("Lat: %.4f Lon: %.4f Dist: %.2f Zone: %s\n",
                lat, lon, dist, zone.c_str());

  // ✅ Clean packet framing
  LoRa.beginPacket();
  LoRa.print("<");
  LoRa.printf("BOAT1,%.4f,%.4f,%.2f,%s", lat, lon, dist, zone.c_str());
  LoRa.print(">");
  LoRa.endPacket();

  delay(10); // stability

  delay(2000);
}
