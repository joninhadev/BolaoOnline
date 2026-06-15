const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
const { MercadoPagoConfig, Payment } = require('mercadopago');
require('dotenv').config();

const pool = require('./db');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
const io = new Server(server, { cors: { origin: '*' } });

let chatHistory = [];

io.on('connection', (socket) => {
    socket.emit('chatHistory', chatHistory);
    socket.on('sendMessage', (data) => {
        const message = {
            id: Date.now(), user: data.user, text: data.text,
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };
        chatHistory.push(message);
        if (chatHistory.length > 50) chatHistory.shift();
        io.emit('newMessage', message);
    });
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// ==========================================
// ROTAS DE AUTENTICAÇÃO
// ==========================================
app.post('/register', async (req, res) => {
    try {
        const { nome_completo, email, senha } = req.body;
        const hashedPassword = await bcrypt.hash(senha, 10);
        await pool.query('INSERT INTO users (nome_completo, email, senha_hash) VALUES (?, ?, ?)', [nome_completo, email, hashedPassword]);
        res.status(201).json({ message: 'Usuário registrado com sucesso!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'E-mail já cadastrado.' });
        res.status(500).json({ error: 'Erro ao registrar usuário.' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(400).json({ error: 'Usuário não encontrado.' });
        
        const validPassword = await bcrypt.compare(senha, users[0].senha_hash);
        if (!validPassword) return res.status(400).json({ error: 'Senha incorreta.' });
        
        const token = jwt.sign({ id: users[0].id, nome: users[0].nome_completo, email: users[0].email }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, nome: users[0].nome_completo });
    } catch (error) {
        res.status(500).json({ error: 'Erro no login.' });
    }
});

// ==========================================
// ROTAS DE JOGOS E APOSTAS
// ==========================================
app.get('/games', authenticateToken, async (req, res) => {
    try {
        const [games] = await pool.query('SELECT * FROM games ORDER BY data_jogo ASC');
        res.json(games);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar jogos.' });
    }
});

app.post('/bet', authenticateToken, async (req, res) => {
    try {
        const { game_id, gols_casa, gols_fora } = req.body;
        const user_id = req.user.id;
        const valor_aposta = 10.00;

        const deadline = new Date('2026-06-19T21:25:00-03:00');
        if (new Date() > deadline) {
            return res.status(400).json({ error: 'Tempo esgotado!' });
        }

        const [result] = await pool.query(
            'INSERT INTO bets (user_id, game_id, valor, gols_casa, gols_fora, status_pagamento) VALUES (?, ?, ?, ?, ?, "pendente")',
            [user_id, game_id, valor_aposta, gols_casa, gols_fora]
        );
        const aposta_id = result.insertId;

        // Geração do PIX via Mercado Pago
        const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-DUMMY' });
        const payment = new Payment(client);
        
        const mpResponse = await payment.create({
            body: {
                transaction_amount: valor_aposta,
                description: `Bolao Aposta ${aposta_id}`,
                payment_method_id: 'pix',
                payer: { email: req.user.email || 'bolao@exemplo.com' },
                external_reference: aposta_id.toString(),
                notification_url: process.env.WEBHOOK_URL + '/webhook' // Precisa ser URL publica
            }
        });

        const pixPayload = mpResponse.point_of_interaction.transaction_data.qr_code;
        const qrCodeBase64 = mpResponse.point_of_interaction.transaction_data.qr_code_base64;

        io.emit('newMessage', { id: Date.now(), user: 'Sistema', text: `🌟 ${req.user.nome} acabou de dar um palpite!`, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) });

        res.json({ message: 'Aposta registrada!', aposta_id, pix_payload: pixPayload, qr_code_base64: 'data:image/png;base64,' + qrCodeBase64 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar pagamento via Mercado Pago.' });
    }
});

app.post('/webhook', async (req, res) => {
    try {
        const action = req.body.action;
        if (action === 'payment.created' || action === 'payment.updated') {
            const paymentId = req.body.data.id;
            
            const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
            const payment = new Payment(client);
            const paymentInfo = await payment.get({ id: paymentId });

            if (paymentInfo.status === 'approved') {
                const aposta_id = paymentInfo.external_reference;
                
                // Atualiza a aposta para paga
                await pool.query('UPDATE bets SET status_pagamento = "aprovado" WHERE id = ?', [aposta_id]);
                
                // Avisa o front end para atualizar a tela!
                io.emit('paymentApproved', { aposta_id });
                io.emit('newMessage', { id: Date.now(), user: 'Sistema', text: `💰 Pagamento aprovado! O prêmio total acabou de aumentar!`, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) });
            }
        }
        res.sendStatus(200);
    } catch(err) {
        console.error("Webhook Error:", err);
        res.sendStatus(500);
    }
});

app.get('/my-bets', authenticateToken, async (req, res) => {
    try {
        const [bets] = await pool.query(`
            SELECT b.id, b.gols_casa, b.gols_fora, b.valor, b.status_pagamento, b.criado_em, g.time_casa, g.time_fora 
            FROM bets b JOIN games g ON b.game_id = g.id
            WHERE b.user_id = ? ORDER BY b.criado_em DESC
        `, [req.user.id]);
        res.json(bets);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar apostas.' });
    }
});

app.get('/pool-total', authenticateToken, async (req, res) => {
    try {
        // SÓ SOMA APOSTAS APROVADAS!
        const [result] = await pool.query('SELECT SUM(valor) as total FROM bets WHERE status_pagamento = "aprovado"');
        const total = result[0].total || 0;
        res.json({ total });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao calcular o prêmio.' });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Servidor Backend MP rodando na porta ${PORT}`);
});
