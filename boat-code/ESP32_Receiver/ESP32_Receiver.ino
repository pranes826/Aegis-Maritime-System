#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <SPI.h>
#include <LoRa.h>

const char* WIFI_SSID = "OnePlus 11 5G FD58";
const char* WIFI_PASSWORD = "pranes2007";
const char* SERVER_URL = "http://172.16.40.200:3000/api/location"; 

// ESP8266 NodeMCU Pins for LoRa
#define SS    D8
#define RST   D0
#define DIO0  D2

void setup() {
  Serial.begin(115200);

  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");
  Serial.print("ESP8266 IP Address: ");
  Serial.println(WiFi.localIP());

  // Initialize LoRa
  LoRa.setPins(SS, RST, DIO0);
  if (!LoRa.begin(433E6)) {
    Serial.println("❌ LoRa init failed. Check wiring!");
    while (1);
  }
  
  // Match the Boat's Radio Frequencies!
  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  LoRa.setSyncWord(0xF3);
  
  Serial.println("📡 LoRa Receiver Ready! Waiting for boat data...");
}

void loop() {
  int packetSize = LoRa.parsePacket();
  
  if (packetSize) {
    String incoming = "";
    while (LoRa.available()) {
      incoming += (char)LoRa.read();
    }
    
    Serial.println("\n--- 📡 LORA PACKET RECEIVED ---");
    Serial.println("Raw Data: " + incoming);

    int firstComma = incoming.indexOf(',');
    int secondComma = incoming.indexOf(',', firstComma + 1);
    int thirdComma = incoming.indexOf(',', secondComma + 1);
    int fourthComma = incoming.indexOf(',', thirdComma + 1);

    if (firstComma > 0 && fourthComma > 0) {
      String lat = incoming.substring(firstComma + 1, secondComma);
      String lon = incoming.substring(secondComma + 1, thirdComma);
      String dist = incoming.substring(thirdComma + 1, fourthComma);
      String zone = incoming.substring(fourthComma + 1);

      String jsonPayload = "{\"lat\":" + lat + ",\"lon\":" + lon + ",\"distance\":" + dist + ",\"zone\":\"" + zone + "\"}";
      Serial.println("Sending to Backend: " + jsonPayload);

      if (WiFi.status() == WL_CONNECTED) {
        WiFiClient client;
        HTTPClient http;
        http.begin(client, SERVER_URL);
        http.addHeader("Content-Type", "application/json");
        
        int httpResponseCode = http.POST(jsonPayload);
        
        if (httpResponseCode > 0) {
          Serial.printf("✅ HTTP Response code: %d\n", httpResponseCode);
        } else {
          Serial.printf("⚠️ HTTP Error code: %d\n", httpResponseCode);
        }
        http.end();
      } else {
        Serial.println("⚠️ WiFi Disconnected. Reconnecting...");
      }
    }
  }
}