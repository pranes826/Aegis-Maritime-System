#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <SPI.h>
#include <LoRa.h>
#include <math.h>

#define DEMO_MODE false

// --- PIN DEFINITIONS ---
// LoRa
#define SS    5
#define RST   14
#define DIO0  2

// Alerts
#define LED_PIN    4
#define BUZZER_PIN 15

// --- ZONE THRESHOLDS ---
const float DANGER_KM  = 10.0;
const float WARNING_KM = 20.0;

// Boundary coordinates (Palk Strait)
float boundaryLats[] = {9.50, 9.70, 9.95, 10.15, 10.35};
float boundaryLons[] = {80.30, 80.20, 80.10, 79.95, 79.80};
int numPoints = 5;

// Simulated route for Hackathon Demo (Safe → Warning → Danger)
// 15 total steps (2 seconds each). 10s Safe -> 10s Warning -> 10s Danger
float simLats[] = {
  // 5 SAFE points (>20km)
  9.15, 9.18, 9.21, 9.24, 9.28,
  // 5 WARNING points (10-20km)
  9.33, 9.35, 9.37, 9.38, 9.40,
  // 5 DANGER points (<10km)
  9.42, 9.44, 9.46, 9.48, 9.50
};

int simStep = 0; 

// Keeping Longitude perfectly locked so the map trail looks smooth
float simLons[] = {
  80.30, 80.30, 80.30, 80.30, 80.30,
  80.30, 80.30, 80.30, 80.30, 80.30,
  80.30, 80.30, 80.30, 80.30, 80.30
};


TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

// Calculate real-world distance between two coordinates
float haversineDistance(float lat1, float lon1, float lat2, float lon2) {
  const float R = 6371.0;
  float dLat = radians(lat2 - lat1);
  float dLon = radians(lon2 - lon1);
  float a = sin(dLat/2)*sin(dLat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dLon/2)*sin(dLon/2);
  return R * 2 * atan2(sqrt(a), sqrt(1-a));
}

// Find distance to the closest boundary point
float distanceToBoundary(float curLat, float curLon) {
  float minDist = 99999.0;
  for (int i = 0; i < numPoints; i++) {
    float d = haversineDistance(curLat, curLon, boundaryLats[i], boundaryLons[i]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

// Hardware Alerts
void updateAlert(float dist) {
  if (dist > WARNING_KM) {
    // SAFE ZONE
    digitalWrite(LED_PIN, LOW);
    noTone(BUZZER_PIN);
  } else if (dist > DANGER_KM) {
    // WARNING ZONE (LED Blinks, Buzzer off)
    digitalWrite(LED_PIN, (millis() / 500) % 2); 
    noTone(BUZZER_PIN);
  } else {
    // DANGER ZONE (LED Solid, Buzzer screaming)
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
    Serial.println("LoRa init failed! Check Boat wiring.");
    while (1);
  }
  Serial.println("AEGIS Boat Device Ready!");
}

void loop() {
  float currentLat, currentLon;
  
  if (DEMO_MODE) {
    currentLat = simLats[simStep];
    currentLon = simLons[simStep];
    simStep = (simStep + 1) % 15;
  } else {
    while (gpsSerial.available())
      gps.encode(gpsSerial.read());
    
    if (!gps.location.isValid()) {
      Serial.println("Waiting for GPS fix...");
      delay(2000);
      return;
    }
    currentLat = gps.location.lat();
    currentLon = gps.location.lng();
  }
  
  float dist = distanceToBoundary(currentLat, currentLon);
  updateAlert(dist);
  
  String zone = (dist > WARNING_KM) ? "SAFE" : (dist > DANGER_KM) ? "WARNING" : "DANGER";
  
  Serial.printf("Lat: %.4f | Lon: %.4f | Dist: %.2fkm | Zone: %s\n", currentLat, currentLon, dist, zone.c_str());
  
  // Transmit exact packet format the Base Station expects
  LoRa.beginPacket();
  LoRa.printf("BOAT1,%.4f,%.4f,%.2f,%s", currentLat, currentLon, dist, zone.c_str());
  LoRa.endPacket();
  
  // Smart wait: Pauses LoRa for 2 seconds, but keeps the LED blinking!
  unsigned long waitStart = millis();
  while (millis() - waitStart < 2000) {
    updateAlert(dist);
    delay(20); 
  }
}
