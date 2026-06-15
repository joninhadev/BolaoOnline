import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function Chat({ user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const socketRef = useRef();
  const endRef = useRef();

  useEffect(() => {
    socketRef.current = io((import.meta.env.VITE_API_URL || 'http://localhost:5000'));
    
    socketRef.current.on('chatHistory', (history) => {
      setMessages(history);
    });

    socketRef.current.on('newMessage', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => socketRef.current.disconnect();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    socketRef.current.emit('sendMessage', { user: user.nome, text });
    setText('');
  };

  return (
    <div className="glass-panel chat-container">
      <h3 style={{padding: '1rem', borderBottom: '1px solid var(--glass-border)'}}>Chat ao Vivo</h3>
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className="msg">
            <div className="msg-header">
              <span className="msg-user" style={{color: msg.user === 'Sistema' ? '#fbbf24' : 'var(--primary)'}}>{msg.user}</span>
              <span>{msg.time}</span>
            </div>
            <div style={{color: msg.user === 'Sistema' ? '#fcd34d' : 'white'}}>{msg.text}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="chat-input" onSubmit={sendMessage}>
        <input 
          type="text" 
          placeholder="Digite algo..." 
          value={text} 
          onChange={e => setText(e.target.value)} 
        />
        <button type="submit">Enviar</button>
      </form>
    </div>
  );
}
