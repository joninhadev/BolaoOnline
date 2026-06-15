import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login({ setUser }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/login', { email, senha });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('nome', res.data.nome);
      setUser({ nome: res.data.nome });
      navigate('/dashboard');
    } catch (error) {
      setErro(error.response?.data?.error || 'Erro ao conectar no servidor');
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card">
        <h1>Bolão Online</h1>
        <p style={{marginBottom: '2rem', color: 'var(--text-muted)'}}>Faça login para apostar</p>
        
        {erro && <p style={{color: '#ef4444', marginBottom: '1rem'}}>{erro}</p>}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Senha</label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </div>
          <button type="submit" className="btn">Entrar na Conta</button>
        </form>

        <p style={{marginTop: '1.5rem', fontSize: '0.9rem'}}>
          Não tem conta? <a href="/register" style={{color: 'var(--primary)'}}>Cadastre-se</a>
        </p>
      </div>
    </div>
  );
}
