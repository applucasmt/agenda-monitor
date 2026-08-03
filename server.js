// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Rotas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/agendas', async (req, res) => {
    // Proxy para Google Apps Script
    const scriptUrl = process.env.SCRIPT_URL;
    if (!scriptUrl) {
        return res.status(500).json({ error: 'SCRIPT_URL não configurado' });
    }
    
    try {
        const response = await fetch(`${scriptUrl}?action=listarAgendas`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/agendas', async (req, res) => {
    const scriptUrl = process.env.SCRIPT_URL;
    if (!scriptUrl) {
        return res.status(500).json({ error: 'SCRIPT_URL não configurado' });
    }
    
    try {
        const response = await fetch(`${scriptUrl}?action=criarAgenda`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
