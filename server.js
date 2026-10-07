const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Station ID Mapping
const stationIds = {
    "Berlin": "8011160",
    "München": "8000261",
    "Frankfurt": "8000105",
    "Hamburg": "8000254",
    "Köln": "8000207",
    "Stuttgart": "8000191",
    "Düsseldorf": "8000085",
    "Dortmund": "8000080",
    "Essen": "8000096",
    "Leipzig": "8000222"
};

// API Endpoint to fetch real data
app.get('/api/search', async (req, res) => {
    const { from, to } = req.query;

    const fromId = stationIds[from];
    const toId = stationIds[to];

    if (!fromId || !toId) {
        return res.status(400).json({ error: 'Invalid stations provided' });
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
    console.log(`Server is running on port ${PORT}`);
});
