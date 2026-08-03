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

  const isAuthentic = result?.verdict === 'AUTHENTIC MEDIA';

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

      <div style={styles.content}>
        <div style={styles.formPanel}>
          <div style={styles.headerBlock}>
            <h2 style={styles.title}>Verify Media Authenticity</h2>
            <p style={styles.subtitle}>
              Upload a file and enter its Claim ID to check for tampering.
            </p>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Claim ID</label>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. MT-2026-1234"
              value={claimId}
              onChange={e => setClaimId(e.target.value)}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Upload Media File</label>
            <input
              style={styles.fileInput}
              type="file"
              accept="video/*,image/*"
              onChange={e => setSelectedFile(e.target.files[0])}
            />
            {selectedFile && (
              <p style={styles.fileName}>{selectedFile.name}</p>
            )}
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            style={styles.primaryBtn}
            onClick={handleVerify}
            disabled={loading}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {loading ? 'Verifying...' : 'Verify Authenticity'}
          </button>

          {result && (
            <div style={styles.resultBox}>
              {/* Verdict Banner */}
              <div style={{
                ...styles.verdictBanner,
                backgroundColor: isAuthentic ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                borderColor: isAuthentic ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
              }}>
                <span style={{
                  ...styles.verdictText,
                  color: isAuthentic ? '#10b981' : '#ef4444',
                }}>
                  {isAuthentic ? 'AUTHENTIC MEDIA' : 'MEDIA TAMPERED'}
                </span>
              </div>

              {/* Report Rows */}
              <div style={styles.reportSection}>
                <p style={styles.reportHeading}>Authenticity Report</p>

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
                    {result.hashChainIntegrity === 'VALID' ? 'VALID' : 'BROKEN'}
                  </span>
                </div>

                <div style={styles.reportRow}>
                  <span style={styles.reportLabel}>Watermark</span>
                  <span style={{
                    ...styles.reportValue,
                    color: result.watermarkStatus === 'PRESENT' ? '#10b981' : '#f59e0b'
                  }}>
                    {result.watermarkStatus === 'PRESENT' ? 'PRESENT' : 'MISSING'}
                  </span>
                </div>

                <div style={styles.reportRow}>
                  <span style={styles.reportLabel}>Metadata</span>
                  <span style={{
                    ...styles.reportValue,
                    color: result.metadataMatch === 'VERIFIED' ? '#10b981' : '#ef4444'
                  }}>
                    {result.metadataMatch === 'VERIFIED' ? 'VERIFIED' : 'MISMATCH'}
                  </span>
                </div>

                <div style={styles.reportRow}>
                  <span style={styles.reportLabel}>Uploader ID</span>
                  <span style={styles.reportValue}>
                    {result.originalUploader?.toString().substring(0, 16)}...
                  </span>
                </div>

                <div style={styles.reportRow}>
                  <span style={styles.reportLabel}>Timestamp</span>
                  <span style={styles.reportValue}>
                    {new Date(result.timestamp).toLocaleString()}
                  </span>
                </div>

                <div style={{ ...styles.reportRow, borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                  <span style={styles.reportLabel}>Location</span>
                  <span style={styles.reportValue}>
                    {result.location?.latitude}, {result.location?.longitude}
                  </span>
                </div>
              </div>

              <p style={{
                ...styles.finalNote,
                color: isAuthentic ? '#10b981' : '#ef4444'
              }}>
                {isAuthentic
                  ? 'This media has not been tampered with since submission.'
                  : 'This media has been modified after submission.'}
              </p>
            </div>
          )}
        </div>
      </div>

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
    padding: '60px 40px',
  },
  formPanel: {
    width: '100%',
    maxWidth: '480px',
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
    lineHeight: '1.6',
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
  fileInput: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    color: '#f1f5f9',
    boxSizing: 'border-box',
  },
  fileName: {
    color: '#64748b',
    fontSize: '0.85rem',
    marginTop: '8px',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '14px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
    boxShadow: '0 4px 24px rgba(16,185,129,0.3)',
    transition: 'opacity 0.2s',
  },
  error: {
    color: '#ef4444',
    fontSize: '0.85rem',
    marginBottom: '12px',
  },
  resultBox: {
    borderRadius: '12px',
    marginTop: '28px',
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  verdictBanner: {
    padding: '18px',
    textAlign: 'center',
    borderBottom: '1px solid',
  },
  verdictText: {
    fontSize: '1.2rem',
    fontWeight: '800',
    letterSpacing: '0.05em',
  },
  reportSection: {
    padding: '20px',
  },
  reportHeading: {
    color: '#64748b',
    fontSize: '0.75rem',
    marginBottom: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontWeight: '600',
  },
  reportRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  reportLabel: {
    color: '#64748b',
    fontSize: '0.85rem',
  },
  reportValue: {
    color: '#f1f5f9',
    fontSize: '0.85rem',
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '60%',
  },
  finalNote: {
    padding: '14px 20px',
    fontSize: '0.85rem',
    textAlign: 'center',
    borderTop: '1px solid rgba(255,255,255,0.06)',
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

export default Verify;