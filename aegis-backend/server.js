// server.js
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // Allows us to parse incoming JSON from the ESP32

const PORT = 3000;

// Store data in a simple array in memory
let boatData = [];

// 1. ESP32 posts data HERE
app.post('/api/location', (req, res) => {
    const { lat, lon, distance, zone } = req.body;

    if (lat !== undefined && lon !== undefined) {
        const newData = {
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            distance: parseFloat(distance),
            zone: zone,
            timestamp: new Date().toISOString()
        };
        boatData.push(newData);
        console.log(`[UPDATE RECEIVED] Lat: ${lat}, Lon: ${lon}, Zone: ${zone}`);
        res.status(200).send("Data received successfully");
    } else {
        res.status(400).send("Invalid data format");
    }
});

// 2. React Dashboard fetches data from HERE (latest data)
app.get('/api/location', (req, res) => {
    if (boatData.length > 0) {
        res.json(boatData[boatData.length - 1]);
    } else {
        res.json({
            lat: 9.30,
            lon: 80.50,
            distance: 25.0,
            zone: "SAFE",
            timestamp: new Date().toISOString()
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
});