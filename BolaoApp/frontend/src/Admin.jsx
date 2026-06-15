import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
    const [password, setPassword] = useState('');
    const [golsCasa, setGolsCasa] = useState('');
    const [golsFora, setGolsFora] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    // ID do jogo fixo (Brasil x Haiti)
    const gameId = 1;

    const handleFinish = async (e) => {
        e.preventDefault();
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const res = await axios.post(`${apiUrl}/admin/finish`, {
                password,
                game_id: gameId,
                gols_casa: parseInt(golsCasa),
                gols_fora: parseInt(golsFora)
            });
            setMessage(res.data.message);
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (err) {
            setMessage(err.response?.data?.error || 'Erro ao encerrar bolão');
        }
    };

    return (
        <div className="auth-container">
            <div className="glass-panel auth-card">
                <h1>Painel do Admin</h1>
                <p style={{ color: 'var(--primary)', marginBottom: '2rem' }}>Encerrar o Bolão</p>

                <form onSubmit={handleFinish}>
                    <div className="input-group">
                        <label>Senha Mestra</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <div className="input-group" style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                            <label>Gols Brasil</label>
                            <input type="number" style={{ textAlign: 'center', fontSize: '1.5rem', width: '80px' }} value={golsCasa} onChange={e => setGolsCasa(e.target.value)} required />
                        </div>
                        <span style={{ fontSize: '2rem', marginTop: '1.5rem' }}>X</span>
                        <div style={{ textAlign: 'center' }}>
                            <label>Gols Haiti</label>
                            <input type="number" style={{ textAlign: 'center', fontSize: '1.5rem', width: '80px' }} value={golsFora} onChange={e => setGolsFora(e.target.value)} required />
                        </div>
                    </div>
                    <button type="submit" className="btn" style={{ marginTop: '1rem' }}>Finalizar Jogo e Mostrar Ganhadores</button>
                </form>

                {message && <p style={{ marginTop: '1rem', color: message.includes('sucesso') ? '#10b981' : '#ef4444' }}>{message}</p>}
                
                <p style={{ marginTop: '2rem' }}>
                    <a href="/dashboard" style={{ color: 'var(--text-muted)' }}>Voltar ao Início</a>
                </p>
            </div>
        </div>
    );
}
