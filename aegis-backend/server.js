// server.js
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // Allows us to parse incoming JSON from the ESP32
app.use(express.urlencoded({ extended: true })); // Allows standard form data

const PORT = 3000;

// This object will hold the absolute latest reading from the boat
let latestBoatData = {
    lat: 9.30,
    lon: 80.50,
    distance: 25.0,
    zone: "SAFE",
    timestamp: new Date().toLocaleTimeString()
};

// 1. ESP32 Base Station posts data HERE
app.post('/api/location', (req, res) => {
    const { lat, lon, distance, zone } = req.body;
    
    if (lat && lon) {
        latestBoatData = {
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            distance: parseFloat(distance),
            zone: zone,
            timestamp: new Date().toLocaleTimeString()
        };
        console.log(`[UPDATE RECEIVED] Lat: ${lat}, Lon: ${lon}, Zone: ${zone}`);
        res.status(200).send("Data received successfully");
    } else {
        res.status(400).send("Invalid data format");
    }
});

// 2. React Dashboard fetches data from HERE
app.get('/api/location', (req, res) => {
    res.json(latestBoatData);
});

app.listen(PORT, () => {
    console.log(`🛡️ AEGIS Backend running on http://localhost:${PORT}`);
});