import { useState, useEffect } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import Chat from './Chat';

export default function Dashboard({ user, setUser }) {
  const [games, setGames] = useState([]);
  const [myBets, setMyBets] = useState([]);
  const [poolTotal, setPoolTotal] = useState(0);
  const [winners, setWinners] = useState([]);
  
  // Modal states
  const [activeGameId, setActiveGameId] = useState(null);
  const [golsCasa, setGolsCasa] = useState(0);
  const [golsFora, setGolsFora] = useState(0);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [pixKey, setPixKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const token = localStorage.getItem('token');

  const fetchData = async () => {
    try {
      const resGames = await axios.get(((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/games'), { headers: { Authorization: `Bearer ${token}` } });
      setGames(resGames.data);
      
      const resBets = await axios.get(((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/my-bets'), { headers: { Authorization: `Bearer ${token}` } });
      setMyBets(resBets.data);

      const resPool = await axios.get(((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/pool-total'), { headers: { Authorization: `Bearer ${token}` } });
      setPoolTotal(resPool.data.total);

      // Busca ganhadores do primeiro jogo (se finalizado)
      if (resGames.data.length > 0 && resGames.data[0].status === 'finalizado') {
         const resWinners = await axios.get(((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/winners/' + resGames.data[0].id), { headers: { Authorization: `Bearer ${token}` } });
         setWinners(resWinners.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openBetModal = (gameId) => {
    setActiveGameId(gameId);
    setGolsCasa(0);
    setGolsFora(0);
    setQrCodeData(null);
    setModalError('');
  };

  const handleBet = async () => {
    setLoading(true);
    setModalError('');
    try {
      const res = await axios.post(((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/bet'), 
        { game_id: activeGameId, gols_casa: golsCasa, gols_fora: golsFora }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const payload = res.data.pix_payload;
      setPixKey(payload);
      
      // Usa a imagem gerada pelo Mercado Pago
      setQrCodeData(res.data.qr_code_base64);
      
      fetchData();
    } catch (err) {
      setModalError(err.response?.data?.error || "Erro ao processar o palpite");
    }
    setLoading(false);
  };

  useEffect(() => {
    // Escuta avisos do servidor
    import('socket.io-client').then(({ io }) => {
      const socket = io((import.meta.env.VITE_API_URL || 'http://localhost:5000'));
      socket.on('paymentApproved', () => fetchData());
      socket.on('gameFinished', () => fetchData());
      return () => socket.disconnect();
    });
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('nome');
    setUser(null);
  };

  return (
    <div className="container">
      <div className="main-content">
        <div className="header">
          <div>
            <h2>Olá, {user.nome}!</h2>
            <p style={{color: 'var(--text-muted)'}}>Faça o seu palpite antes do prazo final.</p>
          </div>
          <button onClick={logout} style={{background:'transparent', border:'1px solid var(--text-muted)', padding:'0.5rem 1rem', borderRadius:'8px', color:'white', cursor:'pointer'}}>Sair</button>
        </div>

        <div className="pool-total">
          <p>Prêmio Acumulado do Bolão</p>
          <h2>R$ {Number(poolTotal).toFixed(2).replace('.', ',')}</h2>
          <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem'}}>Já descontada a taxa de gerência (20%)</p>
        </div>

        <h3 style={{marginBottom: '1.5rem'}}>Aposta Oficial</h3>
        <div className="games-grid">
          {games.map(game => (
            <div key={game.id} className="glass-panel game-card">
              <p style={{color: 'var(--primary)', fontWeight: '600', marginBottom: '1rem'}}>{new Date(game.data_jogo).toLocaleString('pt-BR')}</p>
              
              <div className="matchup">
                <span>{game.time_casa} {game.status === 'finalizado' ? game.gols_casa_real : ''}</span>
                <span className="vs">X</span>
                <span>{game.status === 'finalizado' ? game.gols_fora_real : ''} {game.time_fora}</span>
              </div>

              {game.status !== 'finalizado' ? (
                <button className="btn" onClick={() => openBetModal(game.id)}>
                  Dar Meu Palpite (R$ 10,00)
                </button>
              ) : (
                <div style={{marginTop: '2rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '12px'}}>
                  <h3 style={{color: '#10b981', marginBottom: '1rem'}}>Fim de Jogo!</h3>
                  <p style={{color: 'var(--text-main)', marginBottom: '1rem'}}>
                    {winners.length > 0 ? `Os ganhadores vão dividir os R$ ${poolTotal.toFixed(2)}!` : 'Ninguém acertou o placar exato desta vez!'}
                  </p>
                  {winners.map((w, i) => (
                    <div key={i} style={{fontWeight: 'bold', color: 'var(--primary)', fontSize: '1.2rem', margin: '0.5rem 0'}}>
                      🏆 {w.nome_completo}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {myBets.length > 0 && (
          <div className="my-bets">
            <h3 style={{marginBottom: '1rem'}}>Meus Palpites Registrados</h3>
            <div className="glass-panel" style={{padding: '0'}}>
              {myBets.map(bet => (
                <div key={bet.id} className="bet-item">
                  <div>
                    <strong style={{color:'var(--primary)'}}>{bet.time_casa} {bet.gols_casa} x {bet.gols_fora} {bet.time_fora}</strong>
                    <div style={{fontSize:'0.8rem', color:'var(--text-muted)', marginTop:'0.2rem'}}>{new Date(bet.criado_em).toLocaleString('pt-BR')}</div>
                  </div>
                  <div style={{color: bet.status_pagamento === 'pendente' ? '#f59e0b' : '#10b981', fontWeight: 'bold', fontSize:'0.9rem'}}>
                    {bet.status_pagamento.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Chat user={user} />

      {/* Modal PIX e Palpite */}
      {activeGameId && (
        <div className="modal-overlay" onClick={() => setActiveGameId(null)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()}>
            {!qrCodeData ? (
              <>
                <h2 style={{color: 'var(--primary)'}}>Qual o seu palpite?</h2>
                <p style={{fontSize:'0.9rem', color: 'var(--text-muted)', marginTop:'0.5rem'}}>Insira o placar exato para confirmar sua aposta.</p>
                
                {modalError && <p style={{color: '#ef4444', marginTop: '1rem'}}>{modalError}</p>}
                
                <div className="score-inputs">
                  <input type="number" min="0" value={golsCasa} onChange={e => setGolsCasa(e.target.value)} />
                  <span style={{fontSize:'1.5rem'}}>X</span>
                  <input type="number" min="0" value={golsFora} onChange={e => setGolsFora(e.target.value)} />
                </div>
                
                <button className="btn" onClick={handleBet} disabled={loading}>
                  {loading ? 'Gerando...' : 'Confirmar Pagamento R$ 10'}
                </button>
              </>
            ) : (
              <>
                <h2 style={{color: '#10b981'}}>Palpite Registrado!</h2>
                <p style={{fontSize:'0.9rem', color: 'var(--text-muted)', marginTop:'0.5rem'}}>
                  Abra o app do seu banco e escaneie o código abaixo para confirmar sua aposta de R$ 10,00.
                </p>
                
                <img src={qrCodeData} alt="QR Code PIX" className="qr-code" />
                
                <p style={{fontSize: '0.8rem'}}>Ou copie a chave PIX:</p>
                <div className="pix-key-display">
                  {pixKey}
                </div>
                
                <button className="btn" style={{background: 'transparent', border: '1px solid var(--text-muted)'}} onClick={() => setActiveGameId(null)}>
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
