import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();
  const [modal, setModal] = useState(null); // null | 'docs' | 'about'

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.navLogo}>
          <div style={styles.navLogoIcon}>MT</div>
          <span style={styles.navLogoText}>MediaTrust</span>
        </div>
        <div style={styles.navLinks}>
          <span style={styles.navLink} onClick={() => setModal('docs')}>Documentation</span>
          <span style={styles.navLink} onClick={() => setModal('about')}>About</span>
          <button style={styles.navBtn} onClick={() => navigate('/register')}>
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={styles.hero}>
        <div style={styles.heroBadge}>
          🛡️ &nbsp; Source-Level Media Authentication Framework
        </div>

        <h1 style={styles.heroTitle}>
          Verify the truth behind<br />
          <span style={styles.heroHighlight}>every frame.</span>
        </h1>

        <p style={styles.heroSubtitle}>
          MediaTrust uses cryptographic hashing, hash chaining, and invisible DCT
          watermarking to detect tampering and trace the origin of any video or image.
        </p>

        <div style={styles.heroButtons}>
          <button
            style={styles.heroPrimaryBtn}
            onClick={() => navigate('/record')}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            📹 &nbsp; Record & Upload Media
          </button>
          <button
            style={styles.heroSecondaryBtn}
            onClick={() => navigate('/verify')}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
          >
            🔍 &nbsp; Verify Authenticity
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={styles.statsBar}>
        <div style={styles.statItem}>
          <span style={styles.statNumber}>SHA-256</span>
          <span style={styles.statLabel}>Cryptographic Hashing</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <span style={styles.statNumber}>DCT</span>
          <span style={styles.statLabel}>Invisible Watermarking</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <span style={styles.statNumber}>100%</span>
          <span style={styles.statLabel}>Tamper Detection</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <span style={styles.statNumber}>Real-Time</span>
          <span style={styles.statLabel}>In-App Recording</span>
        </div>
      </div>

      {/* Feature Section */}
      <div style={styles.features}>
        <div style={styles.featureItem}>
          <div style={styles.featureIcon}>🔐</div>
          <div>
            <p style={styles.featureTitle}>Cryptographic Integrity</p>
            <p style={styles.featureDesc}>
              Every frame is hashed using SHA-256 and chained together.
              Any modification breaks the chain and is instantly detected.
            </p>
          </div>
        </div>

        <div style={styles.featureDivider} />

        <div style={styles.featureItem}>
          <div style={styles.featureIcon}>💧</div>
          <div>
            <p style={styles.featureTitle}>Invisible Watermarking</p>
            <p style={styles.featureDesc}>
              A hidden DCT watermark embeds the uploader's identity,
              timestamp, GPS, and Claim ID into every submission.
            </p>
          </div>
        </div>

        <div style={styles.featureDivider} />

        <div style={styles.featureItem}>
          <div style={styles.featureIcon}>🕵️</div>
          <div>
            <p style={styles.featureTitle}>Source Tracing</p>
            <p style={styles.featureDesc}>
              Even if media is shared or re-uploaded, the system can
              identify the original submitter and submission details.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <p style={styles.footerText}>
          ST Joseph Engineering College &nbsp;·&nbsp; Dept. of CSE &nbsp;·&nbsp; VTU Belagavi &nbsp;·&nbsp; 2026-27
        </p>
        <p style={styles.footerText}>
          Guide: Dr. Priya R Kamath &nbsp;·&nbsp; Associate Professor
        </p>
      </div>

      {/* Modals */}
      {modal && (
        <div style={styles.overlay} onClick={() => setModal(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setModal(null)}>×</button>

            {modal === 'docs' && (
              <div>
                <h3 style={styles.modalTitle}>Documentation</h3>
                <p style={styles.modalSubtitle}>How MediaTrust works, step by step.</p>

                <div style={styles.modalSection}>
                  <p style={styles.modalStepTitle}>1. Register & Login</p>
                  <p style={styles.modalStepDesc}>
                    Create an account to start submitting media for authentication.
                  </p>
                </div>
                <div style={styles.modalSection}>
                  <p style={styles.modalStepTitle}>2. Record or Upload</p>
                  <p style={styles.modalStepDesc}>
                    Capture a photo/video directly in-app, or upload an existing file.
                    Each submission is hashed with SHA-256 and embedded with a hidden
                    DCT watermark containing your identity, timestamp, and GPS location.
                  </p>
                </div>
                <div style={styles.modalSection}>
                  <p style={styles.modalStepTitle}>3. Get a Claim ID</p>
                  <p style={styles.modalStepDesc}>
                    Every submission returns a unique Claim ID and file hash — save
                    this to verify the media later.
                  </p>
                </div>
                <div style={styles.modalSection}>
                  <p style={styles.modalStepTitle}>4. Verify Anytime</p>
                  <p style={styles.modalStepDesc}>
                    Upload the file along with its Claim ID on the Verify page.
                    MediaTrust checks the hash chain, watermark, and metadata to
                    confirm whether the media has been altered since submission.
                  </p>
                </div>
              </div>
            )}

            {modal === 'about' && (
              <div>
                <h3 style={styles.modalTitle}>About MediaTrust</h3>
                <p style={styles.modalSubtitle}>Source-level media authentication framework.</p>

                <p style={styles.modalStepDesc}>
                  MediaTrust is a final-year project built to combat the growing
                  problem of manipulated and misattributed video/image content.
                  Instead of trying to detect deepfakes after the fact, it verifies
                  authenticity at the source — the moment media is captured or
                  submitted — using cryptographic hashing and invisible watermarking.
                </p>

                <div style={styles.modalDivider} />

                <p style={styles.modalStepTitle}>Project Team</p>
                <p style={styles.modalStepDesc}>
                  ST Joseph Engineering College &nbsp;·&nbsp; Dept. of CSE &nbsp;·&nbsp; VTU Belagavi &nbsp;·&nbsp; 2026-27
                </p>
                <p style={styles.modalStepDesc}>
                  Guide: Dr. Priya R Kamath &nbsp;·&nbsp; Associate Professor
                </p>
              </div>
            )}
          </div>
        </div>
      )}
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

  // Navbar
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
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  navLink: {
    color: '#64748b',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  navBtn: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 20px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontWeight: '600',
  },

  // Hero
  hero: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '80px 40px 60px',
  },
  heroBadge: {
    display: 'inline-block',
    backgroundColor: 'rgba(59,130,246,0.1)',
    border: '1px solid rgba(59,130,246,0.25)',
    color: '#93c5fd',
    fontSize: '0.8rem',
    padding: '6px 18px',
    borderRadius: '999px',
    marginBottom: '32px',
    fontWeight: '500',
  },
  heroTitle: {
    color: '#f1f5f9',
    fontSize: '3.8rem',
    fontWeight: '800',
    lineHeight: '1.15',
    marginBottom: '24px',
    letterSpacing: '-0.03em',
    margin: '0 0 24px 0',
  },
  heroHighlight: {
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  heroSubtitle: {
    color: '#64748b',
    fontSize: '1.05rem',
    lineHeight: '1.7',
    maxWidth: '560px',
    marginBottom: '40px',
  },
  heroButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heroPrimaryBtn: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '14px 32px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'opacity 0.2s',
    boxShadow: '0 4px 24px rgba(59,130,246,0.35)',
  },
  heroSecondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: '#e2e8f0',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '14px 32px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'background-color 0.2s',
  },

  // Stats
  statsBar: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0',
    padding: '32px 60px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    flexWrap: 'wrap',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0 48px',
  },
  statNumber: {
    color: '#f1f5f9',
    fontSize: '1.3rem',
    fontWeight: '700',
    marginBottom: '4px',
  },
  statLabel: {
    color: '#475569',
    fontSize: '0.78rem',
    textAlign: 'center',
  },
  statDivider: {
    width: '1px',
    height: '40px',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Features
  features: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: '0',
    padding: '60px',
    flexWrap: 'wrap',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    maxWidth: '280px',
    padding: '0 32px',
  },
  featureIcon: {
    fontSize: '1.6rem',
    flexShrink: 0,
    marginTop: '2px',
  },
  featureTitle: {
    color: '#e2e8f0',
    fontWeight: '600',
    fontSize: '0.95rem',
    margin: '0 0 8px 0',
  },
  featureDesc: {
    color: '#475569',
    fontSize: '0.85rem',
    lineHeight: '1.6',
    margin: 0,
  },
  featureDivider: {
    width: '1px',
    height: '80px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignSelf: 'center',
  },

  // Footer
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

  // Modal
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#0e1729',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '36px',
    maxWidth: '520px',
    width: '100%',
    maxHeight: '80vh',
    overflowY: 'auto',
    position: 'relative',
    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '20px',
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '1.6rem',
    cursor: 'pointer',
    lineHeight: 1,
  },
  modalTitle: {
    color: '#f1f5f9',
    fontSize: '1.5rem',
    fontWeight: '800',
    margin: '0 0 6px 0',
  },
  modalSubtitle: {
    color: '#64748b',
    fontSize: '0.9rem',
    margin: '0 0 24px 0',
  },
  modalSection: {
    marginBottom: '18px',
  },
  modalStepTitle: {
    color: '#93c5fd',
    fontSize: '0.9rem',
    fontWeight: '700',
    margin: '0 0 6px 0',
  },
  modalStepDesc: {
    color: '#94a3b8',
    fontSize: '0.85rem',
    lineHeight: '1.6',
    margin: 0,
  },
  modalDivider: {
    height: '1px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    margin: '20px 0',
  },
};

export default Home;