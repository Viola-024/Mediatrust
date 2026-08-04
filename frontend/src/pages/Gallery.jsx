import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Gallery() {
  const navigate = useNavigate();
  const [mediaItems, setMediaItems] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('mediatrust_gallery') || '[]');
    setMediaItems(stored);
  }, []);

  const handleDownload = (item) => {
    const a = document.createElement('a');
    a.href = item.url;
    a.download = item.filename;
    a.click();
  };

  const handleDelete = (index) => {
    const updated = mediaItems.filter((_, i) => i !== index);
    setMediaItems(updated);
    localStorage.setItem('mediatrust_gallery', JSON.stringify(updated));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>← Back</button>
        <h2 style={styles.title}>📁 Media Gallery</h2>
        <p style={styles.subtitle}>All media captured in MediaTrust</p>
      </div>

      {mediaItems.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyIcon}>📷</p>
          <p style={styles.emptyText}>No media captured yet</p>
          <button style={styles.primaryBtn} onClick={() => navigate('/record')}>
            Go Record Media
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {mediaItems.map((item, index) => (
            <div key={index} style={styles.card}>
              {item.type === 'image' ? (
                <img src={item.url} alt="captured" style={styles.media} />
              ) : (
                <video src={item.url} controls style={styles.media} />
              )}
              <div style={styles.cardInfo}>
                <p style={styles.cardName}>{item.filename}</p>
                <p style={styles.cardDate}>{item.date}</p>
                {item.claimId && (
                  <p style={styles.cardClaim}>🔖 {item.claimId}</p>
                )}
              </div>
              <div style={styles.cardActions}>
                <button style={styles.downloadBtn} onClick={() => handleDownload(item)}>
                  ⬇️ Download
                </button>
                <button style={styles.deleteBtn} onClick={() => handleDelete(index)}>
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#070d1a',
    fontFamily: "'Segoe UI', sans-serif",
    padding: '40px',
  },
  header: {
    marginBottom: '40px',
  },
  backBtn: {
    backgroundColor: 'transparent',
    color: '#64748b',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.9rem',
    marginBottom: '12px',
    padding: 0,
  },
  title: {
    color: '#f1f5f9',
    fontSize: '2rem',
    fontWeight: '800',
    margin: '0 0 8px 0',
  },
  subtitle: {
    color: '#475569',
    fontSize: '0.9rem',
    margin: 0,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    gap: '16px',
  },
  emptyIcon: {
    fontSize: '4rem',
    margin: 0,
  },
  emptyText: {
    color: '#475569',
    fontSize: '1rem',
    margin: 0,
  },
  primaryBtn: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontWeight: '600',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(59,130,246,0.15)',
    borderRadius: '14px',
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    display: 'block',
    backgroundColor: '#000',
  },
  cardInfo: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  cardName: {
    color: '#e2e8f0',
    fontSize: '0.8rem',
    fontWeight: '600',
    margin: '0 0 4px 0',
    wordBreak: 'break-all',
  },
  cardDate: {
    color: '#475569',
    fontSize: '0.75rem',
    margin: '0 0 4px 0',
  },
  cardClaim: {
    color: '#3b82f6',
    fontSize: '0.75rem',
    margin: 0,
    fontWeight: '600',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
  },
  downloadBtn: {
    flex: 1,
    backgroundColor: 'rgba(59,130,246,0.1)',
    color: '#93c5fd',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: '8px',
    padding: '8px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontWeight: '600',
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: 'rgba(239,68,68,0.1)',
    color: '#fca5a5',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '8px',
    padding: '8px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontWeight: '600',
  },
};

export default Gallery;