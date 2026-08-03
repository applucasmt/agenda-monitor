// server.js - Versão otimizada para Vercel
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API Proxy para Google Apps Script
app.get('/api/agendas', async (req, res) => {
    try {
        const scriptUrl = process.env.SCRIPT_URL;
        if (!scriptUrl) {
            return res.status(500).json({ 
                error: 'SCRIPT_URL não configurado. Adicione no Vercel Dashboard.' 
            });
        }
        
        const response = await fetch(`${scriptUrl}?action=listarAgendas`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/agendas', async (req, res) => {
    try {
        const scriptUrl = process.env.SCRIPT_URL;
        if (!scriptUrl) {
            return res.status(500).json({ 
                error: 'SCRIPT_URL não configurado. Adicione no Vercel Dashboard.' 
            });
        }
        
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

app.post('/api/solicitarAdiamento', async (req, res) => {
    try {
        const scriptUrl = process.env.SCRIPT_URL;
        if (!scriptUrl) {
            return res.status(500).json({ 
                error: 'SCRIPT_URL não configurado. Adicione no Vercel Dashboard.' 
            });
        }
        
        const response = await fetch(`${scriptUrl}?action=solicitarAdiamento`, {
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

app.post('/api/autorizarAdiamento', async (req, res) => {
    try {
        const scriptUrl = process.env.SCRIPT_URL;
        if (!scriptUrl) {
            return res.status(500).json({ 
                error: 'SCRIPT_URL não configurado. Adicione no Vercel Dashboard.' 
            });
        }
        
        const response = await fetch(`${scriptUrl}?action=autorizarAdiamento`, {
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

app.post('/api/rejeitarAdiamento', async (req, res) => {
    try {
        const scriptUrl = process.env.SCRIPT_URL;
        if (!scriptUrl) {
            return res.status(500).json({ 
                error: 'SCRIPT_URL não configurado. Adicione no Vercel Dashboard.' 
            });
        }
        
        const response = await fetch(`${scriptUrl}?action=rejeitarAdiamento`, {
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

app.post('/api/atualizarStatus', async (req, res) => {
    try {
        const scriptUrl = process.env.SCRIPT_URL;
        if (!scriptUrl) {
            return res.status(500).json({ 
                error: 'SCRIPT_URL não configurado. Adicione no Vercel Dashboard.' 
            });
        }
        
        const { id, status } = req.body;
        const response = await fetch(`${scriptUrl}?action=atualizarStatus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status })
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/agendas/:id', async (req, res) => {
    try {
        const scriptUrl = process.env.SCRIPT_URL;
        if (!scriptUrl) {
            return res.status(500).json({ 
                error: 'SCRIPT_URL não configurado. Adicione no Vercel Dashboard.' 
            });
        }
        
        const response = await fetch(`${scriptUrl}?action=excluirAgenda`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: req.params.id })
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fallback para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Exportar para Vercel
module.exports = app;

// Iniciar servidor se não estiver no Vercel
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
}
