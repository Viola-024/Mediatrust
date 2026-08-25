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
        <button style={styles.navBackBtn} onClick={() => navigate('/')}>
          ← Back to Home
        </button>
      </nav>

      <div style={styles.content}>
        <div style={styles.formPanel}>
          <div style={styles.headerBlock}>
            <h2 style={styles.title}>Verify Media</h2>
            <p style={styles.subtitle}>
              Upload a file and enter its Claim ID to run a full forensic analysis.
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
              <p style={styles.fileName}>📁 {selectedFile.name}</p>
            )}
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            style={styles.primaryBtn}
            onClick={handleVerify}
            disabled={loading}
          >
            {loading ? '⏳ Analysing...' : '🔍 Run Forensic Analysis'}
          </button>

          {/* Result */}
          {result && (
            <div style={{
              ...styles.resultBox,
              borderColor: isAuthentic ? '#10b981' : '#ef4444'
            }}>
              {/* Verdict Banner */}
              <div style={{
                ...styles.verdictBanner,
                backgroundColor: isAuthentic ? '#064e3b' : '#450a0a'
              }}>
                <span style={styles.verdictIcon}>
                  {isAuthentic ? '✅' : '❌'}
                </span>
                <span style={{
                  ...styles.verdictText,
                  color: isAuthentic ? '#10b981' : '#ef4444'
                }}>
                  {isAuthentic ? 'AUTHENTIC MEDIA' : 'MEDIA TAMPERED'}
                </span>
              </div>

              {/* Basic Report */}
              <div style={styles.reportSection}>
                <p style={styles.reportHeading}>📋 Forensic Report</p>

                <div style={styles.reportRow}>
                  <span style={styles.reportLabel}>Claim ID</span>
                  <span style={styles.reportValue}>{result.claimId}</span>
                </div>

                <div style={styles.reportRow}>
                  <span style={styles.reportLabel}>Media Type</span>
                  <span style={styles.reportValue}>
                    {result.mediaType === 'video' ? '🎬 Video' : '📸 Image'}
                  </span>
                </div>

                <div style={styles.reportRow}>
                  <span style={styles.reportLabel}>Hash Chain</span>
                  <span style={{
                    ...styles.reportValue,
                    color: result.hashChainIntegrity === 'VALID' ? '#10b981' : '#ef4444'
                  }}>
                    {result.hashChainIntegrity === 'VALID' ? '✅ VALID' : '❌ BROKEN'}
                  </span>
                </div>

                <div style={styles.reportRow}>
                  <span style={styles.reportLabel}>Watermark</span>
                  <span style={{
                    ...styles.reportValue,
                    color: result.watermarkStatus === 'PRESENT' ? '#10b981' : '#f59e0b'
                  }}>
                    {result.watermarkStatus === 'PRESENT' ? '✅ PRESENT' : '⚠️ MISSING'}
                  </span>
                </div>

                <div style={styles.reportRow}>
                  <span style={styles.reportLabel}>Metadata</span>
                  <span style={{
                    ...styles.reportValue,
                    color: result.metadataMatch === 'VERIFIED' ? '#10b981' : '#ef4444'
                  }}>
                    {result.metadataMatch === 'VERIFIED' ? '✅ VERIFIED' : '❌ MISMATCH'}
                  </span>
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

              {/* Frame Analysis Section */}
              <div style={styles.frameSection}>
                <p style={styles.reportHeading}>
                  🔬 {result.mediaType === 'video' ? 'Frame' : 'Block'} Analysis
                </p>

                <div style={styles.statsRow}>
                  <div style={styles.statBox}>
                    <span style={styles.statNumber}>{result.totalFrames}</span>
                    <span style={styles.statLabel}>
                      Total {result.mediaType === 'video' ? 'Frames' : 'Blocks'}
                    </span>
                  </div>
                  <div style={styles.statBox}>
                    <span style={{
                      ...styles.statNumber,
                      color: '#10b981'
                    }}>
                      {result.intactCount}
                    </span>
                    <span style={styles.statLabel}>Intact</span>
                  </div>
                  <div style={styles.statBox}>
                    <span style={{
                      ...styles.statNumber,
                      color: result.tamperedCount > 0 ? '#ef4444' : '#10b981'
                    }}>
                      {result.tamperedCount}
                    </span>
                    <span style={styles.statLabel}>Tampered</span>
                  </div>
                  <div style={styles.statBox}>
                    <span style={{
                      ...styles.statNumber,
                      color: result.tamperPercentage > 0 ? '#ef4444' : '#10b981'
                    }}>
                      {result.tamperPercentage}%
                    </span>
                    <span style={styles.statLabel}>Tampered</span>
                  </div>
                </div>

                {/* Tamper Timeline for Video */}
                {result.mediaType === 'video' && result.totalFrames > 0 && (
                  <div style={styles.timelineSection}>
                    <p style={styles.timelineLabel}>
                      Frame Timeline
                    </p>
                    <div style={styles.timeline}>
                      {Array.from({ length: Math.min(result.totalFrames, 100) }).map((_, i) => {
                        const frameIndex = Math.floor(i * result.totalFrames / Math.min(result.totalFrames, 100));
                        const isTampered = result.tamperedFrames?.some(
                          f => f.frame_index === frameIndex
                        );
                        return (
                          <div
                            key={i}
                            title={`Frame ${frameIndex}: ${isTampered ? 'TAMPERED' : 'INTACT'}`}
                            style={{
                              ...styles.timelineBlock,
                              backgroundColor: isTampered ? '#ef4444' : '#10b981',
                            }}
                          />
                        );
                      })}
                    </div>
                    <div style={styles.timelineLegend}>
                      <span style={styles.legendItem}>
                        <span style={{ ...styles.legendDot, backgroundColor: '#10b981' }} />
                        Intact
                      </span>
                      <span style={styles.legendItem}>
                        <span style={{ ...styles.legendDot, backgroundColor: '#ef4444' }} />
                        Tampered
                      </span>
                    </div>
                    {result.firstTamperedFrame !== null && (
                      <p style={styles.tamperedNote}>
                        ⚠️ First tampered frame detected at frame {result.firstTamperedFrame}
                      </p>
                    )}
                  </div>
                )}

                {/* Tampered blocks list */}
                {result.tamperedCount > 0 && (
                  <div style={styles.tamperedList}>
                    <p style={styles.tamperedListTitle}>
                      ⚠️ Tampered {result.mediaType === 'video' ? 'Frames' : 'Regions'}:
                    </p>
                    <div style={styles.tamperedScroll}>
                      {(result.tamperedFrames?.length > 0
                        ? result.tamperedFrames
                        : result.tamperedBlocks
                      )?.slice(0, 10).map((item, i) => (
                        <div key={i} style={styles.tamperedItem}>
                          {result.mediaType === 'video'
                            ? `Frame ${item.frame_index} (Expected: ${item.expected} → Got: ${item.got})`
                            : `Region at row ${item.row}, col ${item.col}`
                          }
                        </div>
                      ))}
                      {result.tamperedCount > 10 && (
                        <p style={styles.moreText}>
                          ... and {result.tamperedCount - 10} more
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Edit Diagnostics - What was edited */}
                {result.editDiagnostics && result.editDiagnostics.length > 0 && (
                  <div style={styles.diagnosticsSection}>
                    <p style={styles.diagnosticsTitle}>
                      🔍 Modification Diagnostics (What Was Edited):
                    </p>
                    <div style={styles.diagnosticsList}>
                      {result.editDiagnostics.map((diag, i) => (
                        <div key={i} style={styles.diagnosticItem}>
                          {diag}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Visual Side-by-Side Comparison */}
                {result.visualComparisons && result.visualComparisons.length > 0 && (
                  <div style={styles.visualCompSection}>
                    <p style={styles.visualCompTitle}>
                      📸 Visual Frame Comparison (Original vs Tampered):
                    </p>
                    {result.visualComparisons.map((comp, idx) => (
                      <div key={idx} style={styles.compCard}>
                        <p style={styles.compCardHeading}>
                          Frame #{comp.frame_index} Inspection
                        </p>
                        <div style={styles.compGrid}>
                          <div style={styles.compColumn}>
                            <span style={styles.compBadgeOriginal}>✅ Original</span>
                            <img
                              src={comp.original_image}
                              alt={`Original Frame ${comp.frame_index}`}
                              style={styles.compImg}
                            />
                          </div>
                          <div style={styles.compColumn}>
                            <span style={styles.compBadgeTampered}>❌ Tampered</span>
                            <img
                              src={comp.tampered_image}
                              alt={`Tampered Frame ${comp.frame_index}`}
                              style={styles.compImg}
                            />
                          </div>
                          <div style={styles.compColumn}>
                            <span style={styles.compBadgeDiff}>🔥 Difference Heatmap</span>
                            <img
                              src={comp.diff_heatmap}
                              alt={`Difference Frame ${comp.frame_index}`}
                              style={styles.compImg}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Final Note */}
              <p style={{
                ...styles.finalNote,
                color: isAuthentic ? '#10b981' : '#ef4444'
              }}>
                {isAuthentic
                  ? '🛡️ All frames verified. This media has not been tampered with since submission.'
                  : `⚠️ ${result.tamperedCount} ${result.mediaType === 'video' ? 'frame(s)' : 'region(s)'} were modified after submission.`
                }
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
    maxWidth: '560px',
  },
  headerBlock: {
    marginBottom: '28px',
  },
  title: {
    color: '#f1f5f9',
    fontSize: '2rem',
    fontWeight: '800',
    margin: '0 0 8px 0',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '0.9rem',
    margin: 0,
  },
  fieldGroup: {
    marginBottom: '18px',
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
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '14px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '12px',
    boxShadow: '0 4px 24px rgba(59,130,246,0.3)',
  },
  error: {
    color: '#ef4444',
    fontSize: '0.85rem',
    marginBottom: '8px',
  },
  resultBox: {
    borderRadius: '12px',
    marginTop: '24px',
    border: '2px solid',
    overflow: 'hidden',
  },
  verdictBanner: {
    padding: '24px',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  verdictIcon: {
    fontSize: '2rem',
  },
  verdictText: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
  },
  reportSection: {
    backgroundColor: '#0f172a',
    padding: '20px',
  },
  reportHeading: {
    color: '#64748b',
    fontSize: '0.75rem',
    marginBottom: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  reportRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  reportLabel: {
    color: '#64748b',
    fontSize: '0.85rem',
  },
  reportValue: {
    color: '#f1f5f9',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    textAlign: 'right',
    maxWidth: '60%',
  },
  frameSection: {
    backgroundColor: '#080f1f',
    padding: '20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  statsRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    padding: '12px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statNumber: {
    color: '#f1f5f9',
    fontSize: '1.3rem',
    fontWeight: '800',
  },
  statLabel: {
    color: '#475569',
    fontSize: '0.7rem',
  },
  timelineSection: {
    marginBottom: '16px',
  },
  timelineLabel: {
    color: '#64748b',
    fontSize: '0.78rem',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  timeline: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '2px',
    marginBottom: '8px',
  },
  timelineBlock: {
    width: '8px',
    height: '20px',
    borderRadius: '2px',
  },
  timelineLegend: {
    display: 'flex',
    gap: '16px',
    marginBottom: '8px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#64748b',
    fontSize: '0.75rem',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '2px',
  },
  tamperedNote: {
    color: '#f59e0b',
    fontSize: '0.82rem',
    margin: '8px 0 0 0',
  },
  tamperedList: {
    marginTop: '12px',
  },
  tamperedListTitle: {
    color: '#ef4444',
    fontSize: '0.85rem',
    fontWeight: '600',
    marginBottom: '8px',
  },
  tamperedScroll: {
    maxHeight: '120px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  tamperedItem: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '6px',
    padding: '6px 10px',
    color: '#fca5a5',
    fontSize: '0.8rem',
  },
  moreText: {
    color: '#64748b',
    fontSize: '0.8rem',
    margin: '4px 0 0 0',
  },
  diagnosticsSection: {
    marginTop: '16px',
    backgroundColor: 'rgba(239,68,68,0.05)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '10px',
    padding: '12px 14px',
  },
  diagnosticsTitle: {
    color: '#f87171',
    fontSize: '0.85rem',
    fontWeight: '700',
    margin: '0 0 8px 0',
  },
  diagnosticsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  diagnosticItem: {
    color: '#fca5a5',
    fontSize: '0.82rem',
    lineHeight: '1.4',
  },
  visualCompSection: {
    marginTop: '16px',
  },
  visualCompTitle: {
    color: '#f1f5f9',
    fontSize: '0.85rem',
    fontWeight: '700',
    marginBottom: '10px',
  },
  compCard: {
    backgroundColor: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '12px',
    marginBottom: '12px',
  },
  compCardHeading: {
    color: '#94a3b8',
    fontSize: '0.8rem',
    fontWeight: '600',
    margin: '0 0 8px 0',
  },
  compGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
    gap: '10px',
  },
  compColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'center',
  },
  compBadgeOriginal: {
    fontSize: '0.72rem',
    fontWeight: '600',
    color: '#10b981',
    backgroundColor: 'rgba(16,185,129,0.15)',
    padding: '2px 8px',
    borderRadius: '4px',
    width: '100%',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  compBadgeTampered: {
    fontSize: '0.72rem',
    fontWeight: '600',
    color: '#ef4444',
    backgroundColor: 'rgba(239,68,68,0.15)',
    padding: '2px 8px',
    borderRadius: '4px',
    width: '100%',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  compBadgeDiff: {
    fontSize: '0.72rem',
    fontWeight: '600',
    color: '#f59e0b',
    backgroundColor: 'rgba(245,158,11,0.15)',
    padding: '2px 8px',
    borderRadius: '4px',
    width: '100%',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  compImg: {
    width: '100%',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.1)',
    aspectRatio: '4/3',
    objectFit: 'cover',
    backgroundColor: '#000',
  },
  finalNote: {
    padding: '14px 20px',
    fontSize: '0.85rem',
    textAlign: 'center',
    backgroundColor: '#0f172a',
    margin: 0,
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