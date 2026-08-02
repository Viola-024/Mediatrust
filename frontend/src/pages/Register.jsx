import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post('http://localhost:5000/api/auth/register', {
        name,
        email,
        password
      });
      setSuccess('Registered successfully! Redirecting to upload...');
      setTimeout(() => navigate('/record'), 2000);
    } catch (err) {
      setError('Registration failed. Email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>← Back</button>
        <h2 style={styles.title}>📝 Register</h2>

        <p style={styles.label}>Full Name</p>
        <input
          style={styles.input}
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <p style={styles.label}>Email</p>
        <input
          style={styles.input}
          type="email"
          placeholder="Your email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <p style={styles.label}>Password</p>
        <input
          style={styles.input}
          type="password"
          placeholder="Choose a password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {error && <p style={styles.error}>{error}</p>}
        {success && <p style={styles.success}>{success}</p>}

        <button
          style={styles.primaryBtn}
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? 'Registering...' : '📝 Register'}
        </button>

        <p style={styles.loginText}>
          Already have an account?{' '}
          <span style={styles.link} onClick={() => navigate('/record')}>
            Login
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#0f172a',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
  },
  title: {
    color: '#f1f5f9',
    fontSize: '1.8rem',
    marginBottom: '24px',
  },
  label: {
    color: '#94a3b8',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '16px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '4px',
  },
  backBtn: {
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: 'none',
    cursor: 'pointer',
    marginBottom: '16px',
    fontSize: '0.9rem',
  },
  error: {
    color: '#ef4444',
    fontSize: '0.9rem',
    marginBottom: '8px',
  },
  success: {
    color: '#10b981',
    fontSize: '0.9rem',
    marginBottom: '8px',
  },
  loginText: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    marginTop: '16px',
    textAlign: 'center',
  },
  link: {
    color: '#3b82f6',
    cursor: 'pointer',
  },
};

export default Register;