import { useState, useEffect } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import Chat from './Chat';

export default function Dashboard({ user, setUser }) {
  const [games, setGames] = useState([]);
  const [myBets, setMyBets] = useState([]);
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
    try {
        setActiveGameId(gameId);
        setGolsCasa(0);
        setGolsFora(0);
        setQrCodeData(null);
        setModalError('');
    } catch(err) {
        alert("Erro no react: " + err.message);
    }
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
      socket.on('paymentApproved', () => {
        fetchData();
        setActiveGameId(null);
        alert("Pagamento PIX Aprovado com Sucesso!");
      });
      socket.on('gameFinished', () => fetchData());
      return () => socket.disconnect();
    });
  }, []);

  const getFlagCode = (teamName) => {
    if (!teamName) return null;
    const name = teamName.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove acentos para facilitar a busca (ex: "suiça" -> "suica")

    const codes = {
      'afeganistao': 'af', 'africa do sul': 'za', 'albania': 'al', 'alemanha': 'de',
      'andorra': 'ad', 'angola': 'ao', 'antigua e barbuda': 'ag', 'arabia saudita': 'sa',
      'argelia': 'dz', 'argentina': 'ar', 'armenia': 'am', 'australia': 'au',
      'austria': 'at', 'azerbaijao': 'az', 'bahamas': 'bs', 'bangladesh': 'bd',
      'barbados': 'bb', 'barein': 'bh', 'belgica': 'be', 'belize': 'bz',
      'benin': 'bj', 'bielorrussia': 'by', 'bolivia': 'bo', 'bosnia': 'ba',
      'botsuana': 'bw', 'brasil': 'br', 'brunei': 'bn', 'bulgaria': 'bg',
      'burkina faso': 'bf', 'burundi': 'bi', 'butao': 'bt', 'cabo verde': 'cv',
      'camaroes': 'cm', 'camboja': 'kh', 'canada': 'ca', 'catar': 'qa', 'qatar': 'qa',
      'cazaquistao': 'kz', 'chade': 'td', 'chile': 'cl', 'china': 'cn',
      'chipre': 'cy', 'colombia': 'co', 'comores': 'km', 'congo': 'cg',
      'coreia do norte': 'kp', 'coreia do sul': 'kr', 'costa do marfim': 'ci',
      'costa rica': 'cr', 'croacia': 'hr', 'cuba': 'cu', 'dinamarca': 'dk',
      'djibuti': 'dj', 'dominica': 'dm', 'egito': 'eg', 'el salvador': 'sv',
      'emirados arabes': 'ae', 'equador': 'ec', 'eritreia': 'er', 'eslovaquia': 'sk',
      'eslovenia': 'si', 'espanha': 'es', 'estados unidos': 'us', 'eua': 'us', 'usa': 'us',
      'estonia': 'ee', 'etiopia': 'et', 'fiji': 'fj', 'filipinas': 'ph',
      'finlandia': 'fi', 'franca': 'fr', 'gabao': 'ga', 'gambia': 'gm',
      'gana': 'gh', 'georgia': 'ge', 'granada': 'gd', 'grecia': 'gr',
      'guatemala': 'gt', 'guiana': 'gy', 'guine': 'gn', 'guine-bissau': 'gw',
      'guine equatorial': 'gq', 'haiti': 'ht', 'honduras': 'hn', 'hungria': 'hu',
      'iemen': 'ye', 'india': 'in', 'indonesia': 'id', 'inglaterra': 'gb-eng',
      'ira': 'ir', 'iraque': 'iq', 'irlanda': 'ie', 'islandia': 'is',
      'israel': 'il', 'italia': 'it', 'jamaica': 'jm', 'japao': 'jp',
      'jordania': 'jo', 'kuwait': 'kw', 'laos': 'la', 'lesoto': 'ls',
      'letonia': 'lv', 'libano': 'lb', 'liberia': 'lr', 'libia': 'ly',
      'liechtenstein': 'li', 'lituania': 'lt', 'luxemburgo': 'lu', 'macedonia': 'mk',
      'madagascar': 'mg', 'malasia': 'my', 'malaui': 'mw', 'maldivas': 'mv',
      'mali': 'ml', 'malta': 'mt', 'marrocos': 'ma', 'mauricio': 'mu',
      'mauritania': 'mr', 'mexico': 'mx', 'mianmar': 'mm', 'micronesia': 'fm',
      'mocambique': 'mz', 'moldavia': 'md', 'monaco': 'mc', 'mongolia': 'mn',
      'montenegro': 'me', 'namibia': 'na', 'nauru': 'nr', 'nepal': 'np',
      'nicaragua': 'ni', 'niger': 'ne', 'nigeria': 'ng', 'noruega': 'no',
      'nova zelandia': 'nz', 'oma': 'om', 'paises baixos': 'nl', 'holanda': 'nl',
      'pais de gales': 'gb-wls', 'gales': 'gb-wls', 'palau': 'pw', 'panama': 'pa',
      'papua nova guine': 'pg', 'paquistao': 'pk', 'paraguai': 'py', 'peru': 'pe',
      'polonia': 'pl', 'portugal': 'pt', 'quenia': 'ke', 'quirguistao': 'kg',
      'reino unido': 'gb', 'republica checa': 'cz', 'republica dominicana': 'do',
      'romenia': 'ro', 'ruanda': 'rw', 'russia': 'ru', 'samoa': 'ws',
      'san marino': 'sm', 'santa lucia': 'lc', 'sao tome e principe': 'st',
      'senegal': 'sn', 'servia': 'rs', 'seychelles': 'sc', 'singapura': 'sg',
      'siria': 'sy', 'somalia': 'so', 'sri lanka': 'lk', 'suazilandia': 'sz',
      'sudao': 'sd', 'sudao do sul': 'ss', 'suecia': 'se', 'suica': 'ch',
      'suriname': 'sr', 'tadjiquistao': 'tj', 'tailandia': 'th', 'tanzania': 'tz',
      'togo': 'tg', 'tonga': 'to', 'trinidad e tobago': 'tt', 'tunisia': 'tn',
      'turcomenistao': 'tm', 'turquia': 'tr', 'tuvalu': 'tv', 'ucrania': 'ua',
      'uganda': 'ug', 'uruguai': 'uy', 'uzbequistao': 'uz', 'vanuatu': 'vu',
      'vaticano': 'va', 'venezuela': 've', 'vietna': 'vn', 'zambia': 'zm', 'zimbabue': 'zw'
    };
    return codes[name] || null;
  };

  const Flag = ({ teamName }) => {
    const code = getFlagCode(teamName);
    if (!code) return null;
    return <img src={`https://flagcdn.com/w40/${code}.png`} width="28" style={{borderRadius: '4px', verticalAlign: 'middle', margin: '0 6px', boxShadow: '0 2px 5px rgba(0,0,0,0.3)'}} alt={teamName} />;
  };

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
            <h2 style={{ fontWeight: '700' }}>Olá, {user.nome}</h2>
            <p style={{color: 'var(--text-muted)'}}>Faça o seu palpite antes do prazo final.</p>
          </div>
          <button onClick={logout} className="btn-outline" style={{padding:'0.5rem 1rem', borderRadius:'8px', cursor:'pointer'}}>Sair</button>
        </div>

        <h3 style={{marginBottom: '1.5rem', fontWeight: '600'}}>Apostas Oficiais</h3>
        <div className="games-grid">
          {games.map(game => (
            <div key={game.id} className="glass-panel game-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <p style={{color: 'var(--primary)', fontWeight: '600'}}>{new Date(game.data_jogo).toLocaleString('pt-BR')}</p>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem', fontWeight: '600' }}>Prêmio Acumulado</p>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>R$ {Number(game.prize_pool || 0).toFixed(2).replace('.', ',')}</strong>
                </div>
              </div>
              
              <div className="matchup">
                <span style={{ display: 'flex', alignItems: 'center' }}><Flag teamName={game.time_casa} /> <span style={{ marginLeft: '0.5rem' }}>{game.time_casa}</span> {game.status === 'finalizado' ? <span style={{color:'var(--primary)', marginLeft: '0.5rem'}}>{game.gols_casa_real}</span> : ''}</span>
                <span className="vs">VS</span>
                <span style={{ display: 'flex', alignItems: 'center' }}>{game.status === 'finalizado' ? <span style={{color:'var(--primary)', marginRight: '0.5rem'}}>{game.gols_fora_real}</span> : ''} <span style={{ marginRight: '0.5rem' }}>{game.time_fora}</span> <Flag teamName={game.time_fora} /></span>
              </div>

              {game.status !== 'finalizado' ? (
                <button className="btn" onClick={() => openBetModal(game.id)}>
                  Dar Meu Palpite (R$ 10,00)
                </button>
              ) : (
                <div style={{marginTop: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid var(--primary)', borderRadius: '8px'}}>
                  <h3 style={{color: 'var(--primary)', marginBottom: '1rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px'}}>Partida Encerrada</h3>
                  <p style={{color: 'var(--text-main)', marginBottom: '1rem', fontSize: '0.875rem'}}>
                    {winners.length > 0 ? `Os ganhadores dividirão o prêmio de R$ ${Number(game.prize_pool || 0).toFixed(2)}.` : 'Ninguém acertou o placar exato desta vez.'}
                  </p>
                  {winners.map((w, i) => (
                    <div key={i} style={{fontWeight: '600', color: 'var(--text-main)', margin: '0.5rem 0'}}>
                      {w.nome_completo}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {myBets.length > 0 && (
          <div className="my-bets">
            <h3 style={{marginBottom: '1rem', fontWeight: '600'}}>Meus Palpites Registrados</h3>
            <div className="glass-panel" style={{padding: '0'}}>
              {myBets.map(bet => (
                <div key={bet.id} className="bet-item">
                  <div>
                    <strong style={{ display: 'flex', alignItems: 'center' }}>
                      <Flag teamName={bet.time_casa} /> <span style={{ margin: '0 0.5rem' }}>{bet.time_casa}</span> {bet.gols_casa} <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>x</span> {bet.gols_fora} <span style={{ margin: '0 0.5rem' }}>{bet.time_fora}</span> <Flag teamName={bet.time_fora} />
                    </strong>
                    <div style={{fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'0.5rem'}}>{new Date(bet.criado_em).toLocaleString('pt-BR')}</div>
                  </div>
                  <div>
                    {bet.status_pagamento === 'pendente' 
                      ? <span className="badge badge-warning">Pendente</span> 
                      : <span className="badge badge-success">Aprovado</span>}
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
                <h2 style={{color: 'var(--text-main)', fontSize: '1.25rem', marginBottom: '0.5rem'}}>Qual o seu palpite?</h2>
                <p style={{fontSize:'0.875rem', color: 'var(--text-muted)'}}>Insira o placar exato para confirmar sua aposta.</p>
                
                {modalError && <p style={{color: '#ef4444', marginTop: '1rem', fontSize: '0.875rem'}}>{modalError}</p>}
                
                <div className="score-inputs">
                  <input type="number" min="0" value={golsCasa} onChange={e => setGolsCasa(e.target.value)} />
                  <span style={{fontSize:'1.5rem', color: 'var(--text-muted)'}}>X</span>
                  <input type="number" min="0" value={golsFora} onChange={e => setGolsFora(e.target.value)} />
                </div>
                
                <button className="btn" onClick={handleBet} disabled={loading}>
                  {loading ? 'Gerando QR Code...' : 'Confirmar Pagamento (R$ 10,00)'}
                </button>
              </>
            ) : (
              <>
                <h2 style={{color: 'var(--primary)', fontSize: '1.25rem', marginBottom: '0.5rem'}}>Palpite Registrado</h2>
                <p style={{fontSize:'0.875rem', color: 'var(--text-muted)'}}>
                  Abra o app do seu banco e escaneie o código abaixo para confirmar sua aposta de R$ 10,00.
                </p>
                
                <img src={qrCodeData} alt="QR Code PIX" className="qr-code" />
                
                <p style={{fontSize: '0.875rem', color: 'var(--text-main)'}}>Ou copie a chave PIX:</p>
                <div className="pix-key-display">
                  {pixKey}
                </div>
                
                <button className="btn btn-outline" onClick={() => setActiveGameId(null)}>
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
