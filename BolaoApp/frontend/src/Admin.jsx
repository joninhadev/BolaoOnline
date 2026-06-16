import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    // Estado dos jogos
    const [games, setGames] = useState([]);
    
    // Novo Jogo
    const [newTimeCasa, setNewTimeCasa] = useState('');
    const [newTimeFora, setNewTimeFora] = useState('');
    const [newDataJogo, setNewDataJogo] = useState('');

    // Encerrar Jogo
    const [finishGameId, setFinishGameId] = useState('');
    const [golsCasa, setGolsCasa] = useState('');
    const [golsFora, setGolsFora] = useState('');

    // Histórico de Palpites
    const [allBets, setAllBets] = useState([]);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const fetchGames = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${apiUrl}/games`, { headers: { Authorization: `Bearer ${token}` } });
            setGames(res.data);
            if (res.data.length > 0 && !finishGameId) {
                const pendingGames = res.data.filter(g => g.status !== 'finalizado');
                if (pendingGames.length > 0) setFinishGameId(pendingGames[0].id);
            }
        } catch (err) {
            console.error("Erro ao buscar jogos no admin");
        }
    };

    useEffect(() => {
        fetchGames();
    }, []);

    const handleCreateGame = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${apiUrl}/admin/games`, {
                password,
                time_casa: newTimeCasa,
                time_fora: newTimeFora,
                data_jogo: newDataJogo
            });
            setMessage('✅ ' + res.data.message);
            setNewTimeCasa(''); setNewTimeFora(''); setNewDataJogo('');
            fetchGames();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.error || 'Erro ao criar jogo'));
        }
    };

    const handleFinish = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${apiUrl}/admin/finish`, {
                password,
                game_id: finishGameId,
                gols_casa: parseInt(golsCasa),
                gols_fora: parseInt(golsFora)
            });
            setMessage('🏆 ' + res.data.message);
            setGolsCasa(''); setGolsFora('');
            fetchGames();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.error || 'Erro ao encerrar bolão'));
        }
    };

    const fetchAllBets = async () => {
        try {
            const res = await axios.post(`${apiUrl}/admin/all-bets`, { password });
            setAllBets(res.data);
            setMessage('✅ Palpites carregados com sucesso!');
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.error || 'Senha incorreta para carregar palpites'));
        }
    };

    const handleReset = async () => {
        if (!window.confirm("CUIDADO: Tem certeza absoluta que quer deletar todo o histórico de apostas e jogos?")) return;
        try {
            const res = await axios.post(`${apiUrl}/admin/reset`, { password });
            setMessage('🔥 ' + res.data.message);
            fetchGames();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.error || 'Erro ao resetar sistema'));
        }
    };

    return (
        <div className="container" style={{ flexDirection: 'column', maxWidth: '800px', alignItems: 'center' }}>
            <h1 style={{ color: 'var(--text-main)', marginBottom: '1rem', textAlign: 'center' }}>Painel de Administração</h1>
            <div style={{ width: '100%', marginBottom: '2rem' }}>
                <a href="/dashboard" style={{ color: 'var(--primary)' }}>Voltar ao Início</a>
            </div>

            <div className="glass-panel" style={{ width: '100%', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Autenticação de Administrador</h3>
                <div className="input-group" style={{ marginBottom: 0 }}>
                    <input type="password" placeholder="Digite a Senha Mestra" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                {message && <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>{message}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', width: '100%' }}>
                {/* CRIAR JOGO */}
                <div className="glass-panel">
                    <h3 style={{ color: '#10b981', marginBottom: '1.5rem' }}>Adicionar Novo Jogo</h3>
                    <form onSubmit={handleCreateGame}>
                        <div className="input-group">
                            <label>Time da Casa</label>
                            <input type="text" placeholder="Ex: Brasil" value={newTimeCasa} onChange={e => setNewTimeCasa(e.target.value)} required />
                        </div>
                        <div className="input-group">
                            <label>Time de Fora</label>
                            <input type="text" placeholder="Ex: Argentina" value={newTimeFora} onChange={e => setNewTimeFora(e.target.value)} required />
                        </div>
                        <div className="input-group">
                            <label>Data e Hora do Jogo</label>
                            <input type="datetime-local" value={newDataJogo} onChange={e => setNewDataJogo(e.target.value)} required />
                        </div>
                        <button type="submit" className="btn" style={{ marginTop: '1rem', background: '#10b981' }}>Cadastrar Jogo</button>
                    </form>
                </div>

                {/* FINALIZAR JOGO */}
                <div className="glass-panel">
                    <h3 style={{ color: '#ef4444', marginBottom: '1.5rem' }}>Encerrar Partida</h3>
                    <form onSubmit={handleFinish}>
                        <div className="input-group">
                            <label>Selecione o Jogo Pendente</label>
                            <select 
                                value={finishGameId} 
                                onChange={e => setFinishGameId(e.target.value)} 
                                required
                            >
                                <option value="">Selecione...</option>
                                {games.filter(g => g.status !== 'finalizado').map(g => (
                                    <option key={g.id} value={g.id}>
                                        {g.time_casa} x {g.time_fora} ({new Date(g.data_jogo).toLocaleDateString('pt-BR')})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="input-group" style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center', marginTop: '1.5rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <label>Gols Casa</label>
                                <input type="number" min="0" style={{ textAlign: 'center', fontSize: '1.5rem', width: '80px', padding: '0.5rem' }} value={golsCasa} onChange={e => setGolsCasa(e.target.value)} required />
                            </div>
                            <span style={{ fontSize: '1.5rem', marginTop: '1.5rem', color: 'var(--text-muted)' }}>X</span>
                            <div style={{ textAlign: 'center' }}>
                                <label>Gols Fora</label>
                                <input type="number" min="0" style={{ textAlign: 'center', fontSize: '1.5rem', width: '80px', padding: '0.5rem' }} value={golsFora} onChange={e => setGolsFora(e.target.value)} required />
                            </div>
                        </div>
                        <button type="submit" className="btn" style={{ marginTop: '1rem', background: '#ef4444' }}>Finalizar e Pagar Pix</button>
                    </form>
                </div>

                {/* HISTÓRICO DE PALPITES */}
                <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <h3 style={{ color: 'var(--primary)' }}>Histórico Geral de Palpites</h3>
                        <button onClick={fetchAllBets} className="btn-outline" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem', borderRadius: '6px' }}>Carregar Dados</button>
                    </div>
                    {allBets.length > 0 ? (
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                                        <th style={{ padding: '0.5rem' }}>Data</th>
                                        <th style={{ padding: '0.5rem' }}>Apostador</th>
                                        <th style={{ padding: '0.5rem' }}>Jogo</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'center' }}>Palpite</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'center' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allBets.map(bet => (
                                        <tr key={bet.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                            <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem' }}>{new Date(bet.criado_em).toLocaleString('pt-BR')}</td>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>{bet.nome_completo}</td>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>{bet.time_casa} x {bet.time_fora}</td>
                                            <td style={{ padding: '0.75rem 0.5rem', color: 'var(--primary)', fontWeight: 'bold', textAlign: 'center' }}>{bet.gols_casa} x {bet.gols_fora}</td>
                                            <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                                {bet.status_pagamento === 'pendente' 
                                                    ? <span className="badge badge-warning">Pendente</span> 
                                                    : <span className="badge badge-success">Aprovado</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-muted)' }}>Digite a Senha Mestra acima e clique no botão para carregar os palpites.</p>
                    )}
                </div>

                {/* ZONA DE PERIGO */}
                <div className="glass-panel" style={{ border: '1px solid #ef4444', gridColumn: '1 / -1' }}>
                    <h3 style={{ color: '#ef4444', marginBottom: '1.5rem', textAlign: 'center', textTransform: 'uppercase' }}>Zona de Perigo</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', textAlign: 'center' }}>Atenção: Isso apagará todos os jogos e apostas permanentemente.</p>
                    <button onClick={handleReset} className="btn-outline" style={{ border: '1px solid #ef4444', color: '#ef4444', display: 'block', margin: '0 auto', width: 'auto', padding: '0.5rem 2rem' }}>
                        Zerar Banco de Dados
                    </button>
                </div>
            </div>
        </div>
    );
}
