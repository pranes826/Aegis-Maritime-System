// server.js
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(cors());
app.use(express.json()); // Allows us to parse incoming JSON from the ESP32

const PORT = 3000;

// Initialize SQLite database
const db = new sqlite3.Database('./boat_data.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Create table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS boat_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    boat_id TEXT,
    lat REAL,
    lon REAL,
    distance REAL,
    zone TEXT
)`);

// 1. ESP32 posts data HERE
app.post('/api/location', (req, res) => {
    const { lat, lon, distance, zone, boat_id } = req.body;

    if (lat !== undefined && lon !== undefined) {
        const timestamp = new Date().toISOString();
        db.run(`INSERT INTO boat_data (timestamp, boat_id, lat, lon, distance, zone) VALUES (?, ?, ?, ?, ?, ?)`, 
            [timestamp, boat_id || 'default', parseFloat(lat), parseFloat(lon), parseFloat(distance), zone], 
            function(err) {
                if (err) {
                    console.error('Error inserting data:', err);
                    res.status(500).send("Error saving data");
                } else {
                    console.log(`[UPDATE RECEIVED] Boat ID: ${boat_id || 'default'}, Lat: ${lat}, Lon: ${lon}, Zone: ${zone}`);
                    res.status(200).send("Data received successfully");
                }
            });
    } else {
        res.status(400).send("Invalid data format");
    }
});

// 2. React Dashboard fetches data from HERE (latest data)
app.get('/api/location', (req, res) => {
    db.get(`SELECT * FROM boat_data ORDER BY timestamp DESC LIMIT 1`, (err, row) => {
        if (err) {
            console.error('Error fetching data:', err);
            res.status(500).send("Error fetching data");
        } else if (row) {
            res.json(row);
        } else {
            res.status(404).json({ message: "No data available from ESP32" });
        }
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
});