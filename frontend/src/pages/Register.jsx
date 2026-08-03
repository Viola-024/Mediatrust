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
      {/* Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.navLogo} onClick={() => navigate('/')}>
          <div style={styles.navLogoIcon}>MT</div>
          <span style={styles.navLogoText}>MediaTrust</span>
        </div>
        <button style={styles.navBackBtn} onClick={() => navigate('/')}>← Back to Home</button>
      </nav>

      {/* Content */}
      <div style={styles.content}>
        <div style={styles.formPanel}>
          <div style={styles.headerBlock}>
            <h2 style={styles.title}>Create your account</h2>
            <p style={styles.subtitle}>Register to record, upload, and authenticate media.</p>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              placeholder="Your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              placeholder="Choose a password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}
          {success && <p style={styles.success}>{success}</p>}

          <button
            style={styles.primaryBtn}
            onClick={handleRegister}
            disabled={loading}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {loading ? 'Registering...' : 'Create Account'}
          </button>

          <p style={styles.loginText}>
            Already have an account?{' '}
            <span style={styles.link} onClick={() => navigate('/record')}>Log in</span>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <p style={styles.footerText}>
          ST Joseph Engineering College &nbsp;·&nbsp; Dept. of CSE &nbsp;·&nbsp; VTU Belagavi &nbsp;·&nbsp; 2026-27
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#070d1a',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    display: 'flex',
    flexDirection: 'column',
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 60px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  navLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
  },
  navLogoIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  navLogoText: {
    color: '#f1f5f9',
    fontWeight: '700',
    fontSize: '1.1rem',
    letterSpacing: '-0.02em',
  },
  navBackBtn: {
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '8px 18px',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60px 40px',
  },
  formPanel: {
    width: '100%',
    maxWidth: '420px',
  },
  headerBlock: {
    marginBottom: '32px',
  },
  title: {
    color: '#f1f5f9',
    fontSize: '2rem',
    fontWeight: '800',
    letterSpacing: '-0.02em',
    margin: '0 0 8px 0',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '0.9rem',
    margin: 0,
  },
  fieldGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    color: '#94a3b8',
    fontSize: '0.8rem',
    fontWeight: '600',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    width: '100%',
    padding: '13px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    color: '#f1f5f9',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
    outline: 'none',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '14px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
    boxShadow: '0 4px 24px rgba(59,130,246,0.3)',
    transition: 'opacity 0.2s',
  },
  error: {
    color: '#ef4444',
    fontSize: '0.85rem',
    marginBottom: '12px',
  },
  success: {
    color: '#10b981',
    fontSize: '0.85rem',
    marginBottom: '12px',
  },
  loginText: {
    color: '#64748b',
    fontSize: '0.85rem',
    marginTop: '20px',
    textAlign: 'center',
  },
  link: {
    color: '#3b82f6',
    cursor: 'pointer',
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    padding: '24px 40px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  footerText: {
    color: '#2d3f55',
    fontSize: '0.75rem',
    margin: '4px 0',
  },
};

export default Register;