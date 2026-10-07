const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Instant and reliable DB stations with official IDs
const stationsList = [
    { id: "8011160", name: "Berlin Hbf" },
    { id: "8000261", name: "München Hbf" },
    { id: "8000105", name: "Frankfurt (Main) Hbf" },
    { id: "8000254", name: "Hamburg Hbf" },
    { id: "8000207", name: "Köln Hbf" },
    { id: "8000191", name: "Stuttgart Hbf" },
    { id: "8000085", name: "Düsseldorf Hbf" },
    { id: "8000080", name: "Dortmund Hbf" },
    { id: "8000096", name: "Essen Hbf" },
    { id: "8000222", name: "Leipzig Hbf" }
];

// API to provide stations instantly
app.get('/api/popular-stations', (req, res) => {
    res.json(stationsList);
});

// API to search real journeys
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
    console.log(`db-yathtar-train (Beta V1.0.7) server is running on port ${PORT}`);
});
