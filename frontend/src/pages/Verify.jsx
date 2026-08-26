import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NotificationCenter from '../components/NotificationCenter';

function Verify() {
  const navigate = useNavigate();
  const [claimId, setClaimId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [activeSection, setActiveSection] = useState(1);

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
    setActiveSection(1);

    try {
      const formData = new FormData();
      formData.append('media', selectedFile);
      formData.append('claimId', claimId.trim());

      const token = localStorage.getItem('mediatrust_token');
      const headers = { 'Content-Type': 'multipart/form-data' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await axios.post('http://localhost:5000/api/verify', formData, {
        headers
      });

      setResult(res.data);
      setActiveSection(1);
    } catch (err) {
      setError('Verification failed. Please check your Claim ID and file.');
    } finally {
      setLoading(false);
    }
  };

  const isAuthentic = result?.verdict === 'AUTHENTIC MEDIA';
  const hasVisualComparisons = result?.visualComparisons && result.visualComparisons.length > 0;

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.navLogo} onClick={() => navigate('/')}>
          <div style={styles.navLogoIcon}>MT</div>
          <span style={styles.navLogoText}>MediaTrust</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <NotificationCenter />
          <button style={styles.navBackBtn} onClick={() => navigate('/')}>
            ← Back to Home
          </button>
        </div>
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

          {/* Results Block */}
          {result && (
            <div style={{
              ...styles.resultBox,
              borderColor: isAuthentic ? '#10b981' : '#ef4444'
            }}>
              {/* Main Verdict Card */}
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

              {/* 3-Section Tab Navigation Bar */}
              <div style={styles.tabBar}>
                <button
                  style={{
                    ...styles.tabBtn,
                    ...(activeSection === 1 ? styles.activeTabBtn : {})
                  }}
                  onClick={() => setActiveSection(1)}
                >
                  📋 1. Forensic Report
                </button>
                <button
                  style={{
                    ...styles.tabBtn,
                    ...(activeSection === 2 ? styles.activeTabBtn : {})
                  }}
                  onClick={() => setActiveSection(2)}
                >
                  🔬 2. Frame Timeline
                  {result.tamperedCount > 0 && (
                    <span style={styles.tabBadgeRed}>{result.tamperedCount}</span>
                  )}
                </button>
                <button
                  style={{
                    ...styles.tabBtn,
                    ...(activeSection === 3 ? styles.activeTabBtn : {})
                  }}
                  onClick={() => setActiveSection(3)}
                >
                  📸 3. Visual Comparison
                  {hasVisualComparisons && (
                    <span style={styles.tabBadgeAmber}>{result.visualComparisons.length}</span>
                  )}
                </button>
              </div>

              {/* ─── SECTION 1: Forensic Overview & Report ─── */}
              {activeSection === 1 && (
                <div style={styles.sectionContainer}>
                  <div style={styles.sectionHeader}>
                    <p style={styles.reportHeading}>📋 Section 1: Forensic Identity & Integrity Report</p>
                    <span style={styles.stepIndicator}>Page 1 of 3</span>
                  </div>

                  <div style={styles.reportSection}>
                    <div style={styles.reportRow}>
                      <span style={styles.reportLabel}>Claim ID</span>
                      <span style={styles.reportValue}>{result.claimId}</span>
                    </div>

                    <div style={styles.reportRow}>
                      <span style={styles.reportLabel}>Media Type</span>
                      <span style={styles.reportValue}>
                        {result.mediaType === 'video' ? '🎬 Video Stream' : '📸 Static Image'}
                      </span>
                    </div>

                    <div style={styles.reportRow}>
                      <span style={styles.reportLabel}>Cryptographic Hash Chain</span>
                      <span style={{
                        ...styles.reportValue,
                        color: result.hashChainIntegrity === 'VALID' ? '#10b981' : '#ef4444'
                      }}>
                        {result.hashChainIntegrity === 'VALID' ? '✅ VALID (Unbroken)' : '❌ BROKEN (Discrepancy Detected)'}
                      </span>
                    </div>

                    <div style={styles.reportRow}>
                      <span style={styles.reportLabel}>Imperceptible Watermark</span>
                      <span style={{
                        ...styles.reportValue,
                        color: result.watermarkStatus === 'PRESENT' ? '#10b981' : '#f59e0b'
                      }}>
                        {result.watermarkStatus === 'PRESENT' ? '✅ PRESENT & EXTRACTED' : '⚠️ MISSING / STRIPPED'}
                      </span>
                    </div>

                    <div style={styles.reportRow}>
                      <span style={styles.reportLabel}>Provenance Metadata Match</span>
                      <span style={{
                        ...styles.reportValue,
                        color: result.metadataMatch === 'VERIFIED' ? '#10b981' : '#ef4444'
                      }}>
                        {result.metadataMatch === 'VERIFIED' ? '✅ VERIFIED MATCH' : '❌ METADATA MISMATCH'}
                      </span>
                    </div>

                    <div style={styles.reportRow}>
                      <span style={styles.reportLabel}>Capture Timestamp</span>
                      <span style={styles.reportValue}>
                        {new Date(result.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div style={styles.reportRow}>
                      <span style={styles.reportLabel}>Origin GPS Location</span>
                      <span style={styles.reportValue}>
                        {result.location?.latitude}, {result.location?.longitude}
                      </span>
                    </div>
                  </div>

                  {/* Summary Callout Banner */}
                  <div style={{
                    ...styles.summaryCallout,
                    backgroundColor: isAuthentic ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    borderColor: isAuthentic ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'
                  }}>
                    <p style={{
                      ...styles.summaryCalloutText,
                      color: isAuthentic ? '#10b981' : '#fca5a5'
                    }}>
                      {isAuthentic
                        ? '🛡️ Integrity Verified: All media fingerprints match the original cryptographic record.'
                        : `⚠️ Discrepancy Found: ${result.tamperedCount} frame/region modification(s) detected. See Section 2 for timeline and diagnostics.`
                      }
                    </p>
                  </div>

                  {/* Pagination Footer */}
                  <div style={styles.paginationRow}>
                    <div></div>
                    <button
                      style={styles.navNextBtn}
                      onClick={() => setActiveSection(2)}
                    >
                      Next: Frame Timeline & Diagnostics →
                    </button>
                  </div>
                </div>
              )}

              {/* ─── SECTION 2: Frame Analysis, Timeline & Diagnostics ─── */}
              {activeSection === 2 && (
                <div style={styles.sectionContainer}>
                  <div style={styles.sectionHeader}>
                    <p style={styles.reportHeading}>
                      🔬 Section 2: {result.mediaType === 'video' ? 'Frame-by-Frame' : 'Block-by-Block'} Forensic Timeline
                    </p>
                    <span style={styles.stepIndicator}>Page 2 of 3</span>
                  </div>

                  {/* Stats Grid */}
                  <div style={styles.statsRow}>
                    <div style={styles.statBox}>
                      <span style={styles.statNumber}>{result.totalFrames}</span>
                      <span style={styles.statLabel}>
                        Total {result.mediaType === 'video' ? 'Frames' : 'Blocks'}
                      </span>
                    </div>
                    <div style={styles.statBox}>
                      <span style={{ ...styles.statNumber, color: '#10b981' }}>
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
                      <div style={styles.timelineHeaderRow}>
                        <p style={styles.timelineLabel}>Chronological Sequence Bar</p>
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
                      </div>

                      <div style={styles.timeline}>
                        {Array.from({ length: Math.min(result.totalFrames, 100) }).map((_, i) => {
                          const frameIndex = Math.floor(i * result.totalFrames / Math.min(result.totalFrames, 100));
                          const isTampered = result.tamperedFrames?.some(
                            f => f.frame_index === frameIndex
                          );
                          return (
                            <div
                              key={i}
                              title={`Frame ${frameIndex}: ${isTampered ? 'TAMPERED / ALTERED' : 'INTACT'}`}
                              style={{
                                ...styles.timelineBlock,
                                backgroundColor: isTampered ? '#ef4444' : '#10b981',
                              }}
                            />
                          );
                        })}
                      </div>

                      {result.firstTamperedFrame !== null && (
                        <p style={styles.tamperedNote}>
                          ⚠️ First tampered frame detected at frame #{result.firstTamperedFrame}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Tampered frames list */}
                  {result.tamperedCount > 0 && (
                    <div style={styles.tamperedList}>
                      <p style={styles.tamperedListTitle}>
                        ⚠️ Tampered {result.mediaType === 'video' ? 'Frames Breakdown' : 'Regions Breakdown'}:
                      </p>
                      <div style={styles.tamperedScroll}>
                        {(result.tamperedFrames?.length > 0
                          ? result.tamperedFrames
                          : result.tamperedBlocks
                        )?.slice(0, 10).map((item, i) => (
                          <div key={i} style={styles.tamperedItem}>
                            {result.mediaType === 'video'
                              ? `Frame #${item.frame_index} (${item.got})`
                              : `Region at row ${item.row}, col ${item.col}`
                            }
                          </div>
                        ))}
                        {result.tamperedCount > 10 && (
                          <p style={styles.moreText}>
                            ... and {result.tamperedCount - 10} more altered frames
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Edit Diagnostics */}
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

                  {/* Pagination Footer */}
                  <div style={styles.paginationRow}>
                    <button
                      style={styles.navPrevBtn}
                      onClick={() => setActiveSection(1)}
                    >
                      ← Back to Forensic Report
                    </button>
                    <button
                      style={styles.navNextBtn}
                      onClick={() => setActiveSection(3)}
                    >
                      Next: Visual Frame Inspection →
                    </button>
                  </div>
                </div>
              )}

              {/* ─── SECTION 3: Visual Frame Comparison & Heatmaps ─── */}
              {activeSection === 3 && (
                <div style={styles.sectionContainer}>
                  <div style={styles.sectionHeader}>
                    <p style={styles.reportHeading}>
                      📸 Section 3: Visual Frame Inspection & Difference Heatmaps
                    </p>
                    <span style={styles.stepIndicator}>Page 3 of 3</span>
                  </div>

                  {hasVisualComparisons ? (
                    <div style={styles.visualCompSection}>
                      <p style={styles.visualCompDesc}>
                        Side-by-side forensic visual diffing comparing original stored frames with submitted video frames. Red bounding boxes pinpoint genuinely altered regions.
                      </p>
                      {result.visualComparisons.map((comp, idx) => (
                        <div key={idx} style={styles.compCard}>
                          <p style={styles.compCardHeading}>
                            🔬 Frame #{comp.frame_index} Inspection
                            {comp.bounding_boxes_count > 0 && (
                              <span style={styles.compBoxCountBadge}>
                                {comp.bounding_boxes_count} Altered Region(s)
                              </span>
                            )}
                          </p>
                          <div style={styles.compGrid}>
                            <div style={styles.compColumn}>
                              <span style={styles.compBadgeOriginal}>✅ Original Reference</span>
                              <img
                                src={comp.original_image}
                                alt={`Original Frame ${comp.frame_index}`}
                                style={styles.compImg}
                              />
                            </div>
                            <div style={styles.compColumn}>
                              <span style={styles.compBadgeTampered}>❌ Submitted / Tampered</span>
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
                  ) : (
                    <div style={styles.noVisualBox}>
                      <span style={styles.noVisualIcon}>
                        {isAuthentic ? '🛡️' : '✂️'}
                      </span>
                      <p style={styles.noVisualTitle}>
                        {isAuthentic
                          ? 'No In-Place Visual Modifications'
                          : 'Temporal Trimming / Missing Frames'
                        }
                      </p>
                      <p style={styles.noVisualSubtitle}>
                        {isAuthentic
                          ? 'All frames in the submitted media are authentic without any visual modifications.'
                          : 'The detected modification is temporal (frames were trimmed or cut off). No localized pixel alteration was detected in remaining frames.'
                        }
                      </p>
                    </div>
                  )}

                  {/* Final Note */}
                  <p style={{
                    ...styles.finalNote,
                    color: isAuthentic ? '#10b981' : '#ef4444'
                  }}>
                    {isAuthentic
                      ? '🛡️ All frames verified authentic. This media has not been tampered with.'
                      : `⚠️ Forensic Summary: ${result.tamperedCount} ${result.mediaType === 'video' ? 'frame(s)' : 'region(s)'} modified or removed.`
                    }
                  </p>

                  {/* Pagination Footer */}
                  <div style={styles.paginationRow}>
                    <button
                      style={styles.navPrevBtn}
                      onClick={() => setActiveSection(2)}
                    >
                      ← Back to Frame Timeline
                    </button>
                    <button
                      style={styles.navNextBtn}
                      onClick={() => setActiveSection(1)}
                    >
                      Return to Overview ↺
                    </button>
                  </div>
                </div>
              )}
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
    padding: '40px 20px',
  },
  formPanel: {
    width: '100%',
    maxWidth: '680px',
  },
  headerBlock: {
    marginBottom: '24px',
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
    transition: 'all 0.2s ease',
  },
  error: {
    color: '#ef4444',
    fontSize: '0.85rem',
    marginBottom: '8px',
  },
  resultBox: {
    borderRadius: '14px',
    marginTop: '28px',
    border: '2px solid',
    overflow: 'hidden',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    backgroundColor: '#0a101f',
  },
  verdictBanner: {
    padding: '20px 24px',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  verdictIcon: {
    fontSize: '1.8rem',
  },
  verdictText: {
    fontSize: '1.4rem',
    fontWeight: '800',
    letterSpacing: '0.05em',
  },
  tabBar: {
    display: 'flex',
    backgroundColor: '#080d19',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    overflowX: 'auto',
  },
  tabBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#64748b',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },
  activeTabBtn: {
    color: '#38bdf8',
    backgroundColor: 'rgba(56,189,248,0.06)',
    borderBottom: '2px solid #38bdf8',
  },
  tabBadgeRed: {
    backgroundColor: '#ef4444',
    color: 'white',
    fontSize: '0.7rem',
    fontWeight: '700',
    padding: '1px 6px',
    borderRadius: '10px',
  },
  tabBadgeAmber: {
    backgroundColor: '#f59e0b',
    color: '#0f172a',
    fontSize: '0.7rem',
    fontWeight: '700',
    padding: '1px 6px',
    borderRadius: '10px',
  },
  sectionContainer: {
    padding: '24px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  stepIndicator: {
    color: '#38bdf8',
    fontSize: '0.75rem',
    fontWeight: '700',
    backgroundColor: 'rgba(56,189,248,0.1)',
    padding: '4px 10px',
    borderRadius: '12px',
  },
  reportSection: {
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderRadius: '10px',
    padding: '16px 20px',
    border: '1px solid rgba(255,255,255,0.04)',
    marginBottom: '18px',
  },
  reportHeading: {
    color: '#94a3b8',
    fontSize: '0.85rem',
    fontWeight: '700',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  reportRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
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
    maxWidth: '65%',
  },
  summaryCallout: {
    border: '1px solid',
    borderRadius: '10px',
    padding: '14px 16px',
    marginBottom: '20px',
  },
  summaryCalloutText: {
    fontSize: '0.85rem',
    lineHeight: '1.5',
    margin: 0,
    fontWeight: '500',
  },
  paginationRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    gap: '12px',
  },
  navPrevBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#94a3b8',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  navNextBtn: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 12px rgba(59,130,246,0.3)',
    transition: 'all 0.2s',
  },
  statsRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    padding: '14px 8px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statNumber: {
    color: '#f1f5f9',
    fontSize: '1.4rem',
    fontWeight: '800',
  },
  statLabel: {
    color: '#64748b',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  timelineSection: {
    backgroundColor: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '16px',
  },
  timelineHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  timelineLabel: {
    color: '#94a3b8',
    fontSize: '0.8rem',
    fontWeight: '700',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  timeline: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '3px',
    marginBottom: '10px',
    padding: '8px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: '6px',
  },
  timelineBlock: {
    width: '9px',
    height: '22px',
    borderRadius: '2px',
    transition: 'transform 0.1s',
  },
  timelineLegend: {
    display: 'flex',
    gap: '16px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#94a3b8',
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
    fontWeight: '500',
  },
  tamperedList: {
    marginBottom: '16px',
  },
  tamperedListTitle: {
    color: '#ef4444',
    fontSize: '0.85rem',
    fontWeight: '700',
    marginBottom: '8px',
  },
  tamperedScroll: {
    maxHeight: '120px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  tamperedItem: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '6px',
    padding: '8px 12px',
    color: '#fca5a5',
    fontSize: '0.82rem',
  },
  moreText: {
    color: '#64748b',
    fontSize: '0.8rem',
    margin: '4px 0 0 0',
  },
  diagnosticsSection: {
    backgroundColor: 'rgba(239,68,68,0.06)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '10px',
    padding: '14px 16px',
    marginBottom: '16px',
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
    gap: '8px',
  },
  diagnosticItem: {
    color: '#fca5a5',
    fontSize: '0.82rem',
    lineHeight: '1.45',
  },
  visualCompSection: {
    marginBottom: '16px',
  },
  visualCompDesc: {
    color: '#94a3b8',
    fontSize: '0.82rem',
    marginBottom: '14px',
    lineHeight: '1.4',
  },
  compCard: {
    backgroundColor: 'rgba(15,23,42,0.7)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '14px',
    marginBottom: '14px',
  },
  compCardHeading: {
    color: '#f1f5f9',
    fontSize: '0.85rem',
    fontWeight: '700',
    margin: '0 0 10px 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compBoxCountBadge: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    color: '#ef4444',
    fontSize: '0.72rem',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  compGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
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
    padding: '3px 8px',
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
    padding: '3px 8px',
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
    padding: '3px 8px',
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
  noVisualBox: {
    backgroundColor: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '36px 24px',
    textAlign: 'center',
    marginBottom: '20px',
  },
  noVisualIcon: {
    fontSize: '2.5rem',
    display: 'block',
    marginBottom: '12px',
  },
  noVisualTitle: {
    color: '#f1f5f9',
    fontSize: '1rem',
    fontWeight: '700',
    margin: '0 0 6px 0',
  },
  noVisualSubtitle: {
    color: '#64748b',
    fontSize: '0.85rem',
    margin: 0,
    maxWidth: '450px',
    marginLeft: 'auto',
    marginRight: 'auto',
    lineHeight: '1.4',
  },
  finalNote: {
    padding: '12px 16px',
    fontSize: '0.85rem',
    textAlign: 'center',
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderRadius: '8px',
    margin: '0 0 16px 0',
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

export default Verify;