import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Verify() {
  const navigate = useNavigate();
  const [claimId, setClaimId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!selectedFile) {
      setError('Please select a file.');
      return;
    }
    if (!claimId) {
      setError('Please enter a Claim ID.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('media', selectedFile);
      formData.append('claimId', claimId);

      const res = await axios.post('http://localhost:5000/api/verify', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult(res.data);
    } catch (err) {
      setError('Verification failed. Please check your Claim ID and file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>← Back</button>
        <h2 style={styles.title}>🔍 Verify Media</h2>

        <p style={styles.label}>Enter Claim ID</p>
        <input
          style={styles.input}
          type="text"
          placeholder="e.g. MT-2026-1234"
          value={claimId}
          onChange={e => setClaimId(e.target.value)}
        />

        <p style={styles.label}>Upload Media to Verify</p>
        <input
          style={styles.fileInput}
          type="file"
          accept="video/*,image/*"
          onChange={e => setSelectedFile(e.target.files[0])}
        />
        {selectedFile && (
          <p style={styles.fileName}>📁 {selectedFile.name}</p>
        )}

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={styles.primaryBtn}
          onClick={handleVerify}
          disabled={loading}
        >
          {loading ? 'Verifying...' : '🔍 Verify Authenticity'}
        </button>

        {result && (
          <div style={{
            ...styles.resultBox,
            borderColor: result.verdict === 'AUTHENTIC MEDIA' ? '#10b981' : '#ef4444'
          }}>
            <h3 style={{
              ...styles.resultTitle,
              color: result.verdict === 'AUTHENTIC MEDIA' ? '#10b981' : '#ef4444'
            }}>
              {result.verdict === 'AUTHENTIC MEDIA' ? '✅ AUTHENTIC MEDIA' : '❌ MEDIA TAMPERED'}
            </h3>
            <div style={styles.reportRow}>
              <span style={styles.reportLabel}>Claim ID</span>
              <span style={styles.reportValue}>{result.claimId}</span>
            </div>
            <div style={styles.reportRow}>
              <span style={styles.reportLabel}>Hash Chain</span>
              <span style={{
                ...styles.reportValue,
                color: result.hashChainIntegrity === 'VALID' ? '#10b981' : '#ef4444'
              }}>
                {result.hashChainIntegrity}
              </span>
            </div>
            <div style={styles.reportRow}>
              <span style={styles.reportLabel}>Watermark</span>
              <span style={styles.reportValue}>{result.watermarkStatus}</span>
            </div>
            <div style={styles.reportRow}>
              <span style={styles.reportLabel}>Metadata</span>
              <span style={styles.reportValue}>{result.metadataMatch}</span>
            </div>
            <div style={styles.reportRow}>
              <span style={styles.reportLabel}>Timestamp</span>
              <span style={styles.reportValue}>
                {new Date(result.timestamp).toLocaleString()}
              </span>
            </div>
            <div style={styles.reportRow}>
              <span style={styles.reportLabel}>Location</span>
              <span style={styles.reportValue}>
                {result.location?.latitude}, {result.location?.longitude}
              </span>
            </div>
          </div>
        )}
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
  fileInput: {
    width: '100%',
    padding: '12px',
    marginBottom: '12px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    boxSizing: 'border-box',
  },
  fileName: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    marginBottom: '12px',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '12px',
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
  resultBox: {
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '16px',
    border: '2px solid',
  },
  resultTitle: {
    fontSize: '1.2rem',
    marginBottom: '16px',
  },
  reportRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '8px',
  },
  reportLabel: {
    color: '#94a3b8',
    fontSize: '0.9rem',
  },
  reportValue: {
    color: '#f1f5f9',
    fontSize: '0.9rem',
    fontWeight: 'bold',
  },
};

export default Verify;