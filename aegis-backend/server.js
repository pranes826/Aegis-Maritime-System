// server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// ─── 1. CONNECT TO MONGODB ATLAS ─────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas Connected!'))
  .catch(err => console.log('❌ MongoDB Connection Error:', err));

// ─── 2. SCHEMA & MODEL ───────────────────────────────────────────────────────
const boatSchema = new mongoose.Schema({
  boatId:    { type: String, default: 'BOAT1' },
  lat:       { type: Number, required: true },
  lon:       { type: Number, required: true },
  distance:  { type: Number },
  zone:      { type: String },
  timestamp: { type: Date, default: Date.now }
});

const Boat = mongoose.model('Boat', boatSchema);

// ─── 3. ESP32 POSTS DATA HERE ─────────────────────────────────────────────────
app.post('/api/location', async (req, res) => {
  const { boatId, lat, lon, distance, zone } = req.body;

  if (lat !== undefined && lon !== undefined) {
    try {
      const newData = new Boat({
        boatId:   boatId || 'BOAT1',
        lat:      parseFloat(lat),
        lon:      parseFloat(lon),
        distance: parseFloat(distance),
        zone:     zone,
      });

      await newData.save();
      console.log(`[SAVED TO DB] Lat: ${lat}, Lon: ${lon}, Zone: ${zone}`);
      res.status(201).json({ message: 'Data saved!', data: newData });

    } catch (err) {
      console.error('❌ DB Save Error:', err);
      res.status(500).json({ error: 'Failed to save to database' });
    }
  } else {
    res.status(400).json({ error: 'Invalid data — lat and lon required' });
  }
});

// ─── 4. REACT DASHBOARD GETS LATEST DATA ─────────────────────────────────────
app.get('/api/location', async (req, res) => {
  try {
    const latest = await Boat.findOne().sort({ timestamp: -1 });
    if (latest) {
      res.json(latest);
    } else {
      res.json({
        lat: 9.30, lon: 80.50,
        distance: 25.0, zone: 'SAFE',
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// ─── 5. GET ALL HISTORY ───────────────────────────────────────────────────────
app.get('/api/location/history', async (req, res) => {
  try {
    const all = await Boat.find().sort({ timestamp: -1 }).limit(100);
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});