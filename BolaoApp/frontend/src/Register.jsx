import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Register() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post(((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/register'), { nome_completo: nome, email, senha });
      navigate('/login');
    } catch (error) {
      setErro(error.response?.data?.error || 'Erro ao registrar');
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card">
        <h1>Criar Conta</h1>
        <p style={{marginBottom: '2rem', color: 'var(--text-muted)'}}>Junte-se ao Bolão</p>

        {erro && <p style={{color: '#ef4444', marginBottom: '1rem'}}>{erro}</p>}

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label>Nome Completo</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Senha</label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid var(--border-light)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.5rem' }}>Termos e Condições</strong>
            Ao se cadastrar, você concorda e está ciente de que o prêmio acumulado exibido em cada jogo já reflete o desconto da taxa administrativa de <strong>20%</strong> referente ao gerenciamento da plataforma.
          </div>

          <button type="submit" className="btn">Cadastrar</button>
        </form>

        <p style={{marginTop: '1.5rem', fontSize: '0.9rem'}}>
          Já tem conta? <a href="/login" style={{color: 'var(--primary)'}}>Faça Login</a>
        </p>
      </div>
    </div>
  );
}
