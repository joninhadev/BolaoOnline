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
            time: new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
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
        const [games] = await pool.query(`
            SELECT g.*, COALESCE(SUM(b.valor), 0) * 0.8 as prize_pool 
            FROM games g 
            LEFT JOIN bets b ON g.id = b.game_id AND b.status_pagamento = 'aprovado' 
            GROUP BY g.id 
            ORDER BY g.data_jogo ASC
        `);
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

        const [gameRows] = await pool.query('SELECT data_jogo, status FROM games WHERE id = ?', [game_id]);
        if (gameRows.length === 0) return res.status(404).json({ error: 'Jogo não encontrado!' });
        if (gameRows[0].status === 'finalizado') return res.status(400).json({ error: 'Este jogo já encerrou!' });

        if (new Date() > new Date(gameRows[0].data_jogo)) {
            return res.status(400).json({ error: 'Tempo esgotado para este jogo!' });
        }

        const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Desconhecido';
        const [result] = await pool.query(
            'INSERT INTO bets (user_id, game_id, valor, gols_casa, gols_fora, status_pagamento, ip_address) VALUES (?, ?, ?, ?, ?, "pendente", ?)',
            [user_id, game_id, valor_aposta, gols_casa, gols_fora, ip_address]
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
                notification_url: (process.env.RENDER_EXTERNAL_URL || process.env.WEBHOOK_URL || 'https://bolaoonline.onrender.com') + '/webhook'
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

app.post('/admin/reset', async (req, res) => {
    try {
        const { password } = req.body;
        const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
        if (password !== adminPass) return res.status(403).json({ error: 'Senha incorreta!' });

        await pool.query('DELETE FROM bets');
        await pool.query('DELETE FROM games');
        await pool.query('ALTER TABLE games AUTO_INCREMENT = 1');
        await pool.query('ALTER TABLE bets AUTO_INCREMENT = 1');
        
        io.emit('gameFinished', {}); // trigger para recarregar tudo no cliente
        res.json({ message: 'Sistema zerado com sucesso! Todos os jogos e apostas foram apagados.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao zerar o banco de dados.' });
    }
});

app.post('/admin/all-bets', async (req, res) => {
    try {
        const { password } = req.body;
        const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
        if (password !== adminPass) return res.status(403).json({ error: 'Senha incorreta!' });

        const [bets] = await pool.query(`
            SELECT b.id, b.gols_casa, b.gols_fora, b.valor, b.status_pagamento, b.criado_em, b.ip_address,
                   u.nome_completo, g.time_casa, g.time_fora 
            FROM bets b 
            JOIN users u ON b.user_id = u.id 
            JOIN games g ON b.game_id = g.id 
            ORDER BY b.criado_em DESC
        `);
        res.json(bets);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar histórico de palpites.' });
    }
});

app.post('/admin/backup', async (req, res) => {
    try {
        const { password } = req.body;
        const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
        if (password !== adminPass) return res.status(403).json({ error: 'Senha incorreta!' });

        const [users] = await pool.query('SELECT id, nome_completo, email, criado_em FROM users');
        const [games] = await pool.query('SELECT * FROM games');
        const [bets] = await pool.query('SELECT * FROM bets');

        res.json({ users, games, bets });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao gerar backup.' });
    }
});

// ==========================================
// ROTAS DE ADMINISTRAÇÃO E GANHADORES
// ==========================================
app.post('/admin/games', async (req, res) => {
    try {
        const { password, time_casa, time_fora, data_jogo } = req.body;
        const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
        if (password !== adminPass) return res.status(403).json({ error: 'Senha incorreta!' });

        await pool.query(
            'INSERT INTO games (time_casa, time_fora, data_jogo, status) VALUES (?, ?, ?, "agendado")',
            [time_casa, time_fora, data_jogo]
        );
        io.emit('gameFinished', {}); // trigger para atualizar frontends abertos
        res.json({ message: 'Jogo criado com sucesso!' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar jogo.' });
    }
});

app.put('/admin/games/:id', async (req, res) => {
    try {
        const { password, time_casa, time_fora, data_jogo } = req.body;
        const game_id = req.params.id;
        const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
        if (password !== adminPass) return res.status(403).json({ error: 'Senha incorreta!' });

        await pool.query(
            'UPDATE games SET time_casa = ?, time_fora = ?, data_jogo = ? WHERE id = ?',
            [time_casa, time_fora, data_jogo, game_id]
        );
        io.emit('gameFinished', {}); // trigger reload
        res.json({ message: 'Jogo atualizado com sucesso!' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar jogo.' });
    }
});

app.post('/admin/finish', async (req, res) => {
    try {
        const { password, game_id, gols_casa, gols_fora } = req.body;
        
        // Verifica Senha Mestra
        const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
        if (password !== adminPass) {
            return res.status(403).json({ error: 'Senha incorreta!' });
        }

        // Atualiza o jogo com o placar real e muda status
        await pool.query(
            'UPDATE games SET gols_casa_real = ?, gols_fora_real = ?, status = "finalizado" WHERE id = ?',
            [gols_casa, gols_fora, game_id]
        );

        io.emit('gameFinished', { game_id, gols_casa, gols_fora });
        io.emit('newMessage', { id: Date.now(), user: 'Sistema', text: `🏆 FIM DE JOGO! O resultado final foi ${gols_casa} x ${gols_fora}!`, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) });

        res.json({ message: 'Bolão encerrado com sucesso!' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao encerrar o bolão.' });
    }
});

app.get('/winners/:game_id', authenticateToken, async (req, res) => {
    try {
        const { game_id } = req.params;
        
        // Pega o placar real do jogo
        const [games] = await pool.query('SELECT gols_casa_real, gols_fora_real, status FROM games WHERE id = ?', [game_id]);
        if (games.length === 0 || games[0].status !== 'finalizado') {
            return res.json([]);
        }

        const realCasa = games[0].gols_casa_real;
        const realFora = games[0].gols_fora_real;

        // Busca usuários que acertaram o placar e pagaram
        const [winners] = await pool.query(`
            SELECT u.nome_completo, b.gols_casa, b.gols_fora 
            FROM bets b
            JOIN users u ON b.user_id = u.id
            WHERE b.game_id = ? AND b.status_pagamento = "aprovado" AND b.gols_casa = ? AND b.gols_fora = ?
        `, [game_id, realCasa, realFora]);

        res.json(winners);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar ganhadores.' });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Servidor Backend MP rodando na porta ${PORT}`);
});
