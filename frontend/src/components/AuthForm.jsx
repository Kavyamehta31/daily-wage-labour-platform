import React, { useState } from 'react';
import { loginUser, registerContractor, setToken } from '../api/auth';

export default function AuthForm({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let data;
      if (isLogin) {
        data = await loginUser(email, password);
      } else {
        data = await registerContractor(name, email, password);
      }

      if (data.token) {
        setToken(data.token);
        onAuthSuccess(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="status-card" style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid #ccc' }}>
        <button
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            background: 'none',
            fontWeight: isLogin ? 'bold' : 'normal',
            borderBottom: isLogin ? '2px solid #000' : 'none',
            cursor: 'pointer'
          }}
          onClick={() => { setIsLogin(true); setError(null); }}
        >
          Login
        </button>
        <button
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            background: 'none',
            fontWeight: !isLogin ? 'bold' : 'normal',
            borderBottom: !isLogin ? '2px solid #000' : 'none',
            cursor: 'pointer'
          }}
          onClick={() => { setIsLogin(false); setError(null); }}
        >
          Register Contractor
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {!isLogin && (
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        {error && (
          <div style={{ color: '#b91c1c', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Processing...' : isLogin ? 'Login' : 'Register as Contractor'}
        </button>
      </form>
    </div>
  );
}
