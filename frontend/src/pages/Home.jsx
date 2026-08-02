import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🎬 MediaTrust</h1>
        <p style={styles.subtitle}>
          A Framework for Source-Level Video Authentication
        </p>
        <div style={styles.buttonGroup}>
          <button style={styles.primaryBtn} onClick={() => navigate('/record')}>
            📹 Record & Upload Media
          </button>
          <button style={styles.secondaryBtn} onClick={() => navigate('/verify')}>
            🔍 Verify Media
          </button>
        </div>
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
    padding: '48px',
    textAlign: 'center',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
  },
  title: {
    color: '#f1f5f9',
    fontSize: '2.5rem',
    marginBottom: '12px',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '1rem',
    marginBottom: '40px',
    lineHeight: '1.6',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  primaryBtn: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '14px 24px',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  secondaryBtn: {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '14px 24px',
    fontSize: '1rem',
    cursor: 'pointer',
  },
};

export default Home;