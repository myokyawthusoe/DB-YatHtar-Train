const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 1. API to search stations dynamically from DB
app.get('/api/stations', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);

    try {
        const response = await fetch(`https://v6.db.transport.rest/locations?query=${encodeURIComponent(query)}&results=5`);
        const data = await response.json();
        
        // Filter only stations (type === 'station')
        const stations = data
            .filter(item => item.type === 'station' && item.id)
            .map(item => ({
                id: item.id,
                name: item.name
            }));

        res.json(stations);
    } catch (error) {
        console.error('Station Search Error:', error);
        res.status(500).json({ error: 'Failed to fetch stations' });
    }
});

// 2. API to search real journeys
app.get('/api/search', async (req, res) => {
    const { fromId, toId } = req.query;

    if (!fromId || !toId) {
        return res.status(400).json({ error: 'Station IDs are required' });
    }

    try {
        const response = await fetch(`https://v6.db.transport.rest/journeys?from=${fromId}&to=${toId}&results=5`);
        const data = await response.json();

        if (!data.journeys) {
            return res.json([]);
        }

        const journeys = data.journeys.map(j => {
            const leg = j.legs[0];
            const dep = new Date(leg.departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const arr = new Date(j.legs[j.legs.length - 1].arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const durationMs = new Date(j.legs[j.legs.length - 1].arrival) - new Date(leg.departure);
            const mins = Math.floor(durationMs / 60000);
            const h = Math.floor(mins / 60);
            const m = mins % 60;

            return {
                dep,
                arr,
                duration: `${h}h ${m}m`,
                changes: j.transfers === 0 ? 'Direct' : `${j.transfers} Changes`,
                type: leg.line ? leg.line.name : 'ICE / IC',
                price: (19.99 + (mins * 0.05)).toFixed(2),
                badge: j.transfers === 0 ? 'တိုက်ရိုက် (Direct)' : 'ပြောင်းစီးရန်'
            };
        });

        res.json(journeys);
    } catch (error) {
        console.error('DB API Error:', error);
        res.status(500).json({ error: 'Failed to fetch from DB API' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`db-yathtar-train server is running on port ${PORT}`);
});
