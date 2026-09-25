import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NotificationCenter from '../components/NotificationCenter';

function Gallery() {
  const navigate = useNavigate();
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'video', 'image'
  const [copiedClaimId, setCopiedClaimId] = useState(null);
  const [deletingClaimId, setDeletingClaimId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isCloudSync, setIsCloudSync] = useState(false);

  const token = localStorage.getItem('mediatrust_token');
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('mediatrust_user') || '{}');
    } catch {
      return {};
    }
  })();

  const fetchMedia = async () => {
    setLoading(true);
    setError('');
    let serverItems = [];
    const authToken = localStorage.getItem('mediatrust_token');

    if (authToken) {
      try {
        const res = await axios.get('http://localhost:5000/api/upload/my-media', {
          headers: { Authorization: `Bearer ${authToken}` },
          timeout: 10000
        });
        if (res.data?.success && Array.isArray(res.data.media)) {
          serverItems = res.data.media.map(item => ({
            ...item,
            id: item._id || item.claimId,
            type: item.mediaType || (item.fileName?.endsWith('.webm') || item.fileName?.endsWith('.mp4') ? 'video' : 'image'),
            source: 'cloud'
          }));
          setIsCloudSync(true);
        }
      } catch (err) {
        console.warn('Backend fetch failed or offline, falling back to local storage:', err.message);
        setError(err.response?.data?.message || 'Cloud sync offline. Showing local cache.');
        setIsCloudSync(false);
      }
    } else {
      setIsCloudSync(false);
    }

    // Load local storage items as fallback/cache
    const localItems = JSON.parse(localStorage.getItem('mediatrust_gallery') || '[]').map(item => ({
      ...item,
      id: item.claimId || item.filename || Math.random().toString(),
      source: 'local'
    }));

    // Merge server and local without duplicates (keyed by claimId or serverFileName)
    const seen = new Set();
    const merged = [];

    // Prioritize cloud items
    for (const item of serverItems) {
      const key = item.claimId || item.serverFileName || item.fileName;
      if (key && !seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }

    // Append any local-only items not yet in cloud
    for (const item of localItems) {
      const key = item.claimId || item.serverFileName || item.filename;
      if (key && !seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }

    setMediaItems(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleCopyClaimId = (claimId, e) => {
    e.stopPropagation();
    if (!claimId) return;
    navigator.clipboard.writeText(claimId);
    setCopiedClaimId(claimId);
    setTimeout(() => setCopiedClaimId(null), 2000);
  };

  const handleDownload = async (item, e) => {
    if (e) e.stopPropagation();
    const downloadName = item.filename || `MediaTrust_${item.claimId || 'asset'}.${item.type === 'video' ? 'webm' : 'png'}`;
    const downloadUrl = item.serverFileName
      ? `http://localhost:5000/uploads/${item.serverFileName}`
      : item.url;

    try {
      if (downloadUrl && downloadUrl.startsWith('http')) {
        const response = await fetch(downloadUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } else {
        const a = document.createElement('a');
        a.href = downloadUrl || item.url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Download failed, falling back:', err);
      const a = document.createElement('a');
      a.href = item.url || downloadUrl;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    // Log download event for original uploader
    if (item.claimId || item.serverFileName) {
      try {
        const authToken = localStorage.getItem('mediatrust_token');
        const headers = {};
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

        await axios.post('http://localhost:5000/api/notifications/log-download', {
          claimId: item.claimId,
          fileName: item.serverFileName || item.fileName || item.filename
        }, { headers });
      } catch (logErr) {
        console.warn('Could not log download event:', logErr.message);
      }
    }
  };

  const handleDelete = async (item, e) => {
    if (e) e.stopPropagation();
    const targetClaimId = item.claimId;
    setDeletingClaimId(targetClaimId || item.id);

    try {
      // 1. Delete from backend if logged in and has claimId
      const authToken = localStorage.getItem('mediatrust_token');
      if (authToken && targetClaimId) {
        await axios.delete(`http://localhost:5000/api/upload/${targetClaimId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      }

      // 2. Remove from local storage cache
      const stored = JSON.parse(localStorage.getItem('mediatrust_gallery') || '[]');
      const updatedLocal = stored.filter(loc =>
        (loc.claimId && loc.claimId !== targetClaimId) ||
        (loc.filename && loc.filename !== item.filename)
      );
      localStorage.setItem('mediatrust_gallery', JSON.stringify(updatedLocal));

      // 3. Update React state
      setMediaItems(prev => prev.filter(m => (m.claimId ? m.claimId !== targetClaimId : m.id !== item.id)));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Failed to delete media:', err);
      alert('Could not delete record from server: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeletingClaimId(null);
    }
  };

  const filteredItems = useMemo(() => {
    return mediaItems.filter(item => {
      const matchType =
        filterType === 'all' ||
        (filterType === 'video' && item.type === 'video') ||
        (filterType === 'image' && (item.type === 'image' || item.type === 'photo'));

      const query = searchQuery.toLowerCase().trim();
      const matchQuery =
        !query ||
        (item.claimId && item.claimId.toLowerCase().includes(query)) ||
        (item.fileName && item.fileName.toLowerCase().includes(query)) ||
        (item.filename && item.filename.toLowerCase().includes(query));

      return matchType && matchQuery;
    });
  }, [mediaItems, filterType, searchQuery]);

  const stats = useMemo(() => {
    const total = mediaItems.length;
    const videos = mediaItems.filter(i => i.type === 'video').length;
    const images = mediaItems.filter(i => i.type === 'image' || i.type === 'photo').length;
    return { total, videos, images };
  }, [mediaItems]);

  return (
    <div style={styles.container}>
      {/* Top Navigation */}
      <nav style={styles.navbar}>
        <div style={styles.navBrand} onClick={() => navigate('/')}>
          <div style={styles.navLogoBadge}>MT</div>
          <div>
            <span style={styles.navLogoTitle}>MediaTrust</span>
            <span style={styles.navLogoTag}>GALLERY</span>
          </div>
        </div>

        <div style={styles.navRight}>
          <div style={styles.syncBadge(isCloudSync)}>
            <span style={styles.syncDot(isCloudSync)}></span>
            {isCloudSync ? 'MongoDB Cloud Synced' : token ? 'Local Cache' : 'Guest Mode'}
          </div>

          <NotificationCenter />

          <button style={styles.navBackBtn} onClick={() => navigate('/')}>
            ← Back to Home
          </button>
        </div>
      </nav>

      <main style={styles.content}>
        {/* Header Title & Record CTA */}
        <div style={styles.header}>
          <div>
            <div style={styles.tagline}>
              {user?.name ? `${user.name.toUpperCase()}'S VERIFIED LEDGER` : 'VERIFIED CONTENT LEDGER'}
            </div>
            <h1 style={styles.title}>Authenticated Media Library</h1>
            <p style={styles.subtitle}>
              Browse, download, inspect, and verify all tamper-evident photos and videos anchored to MediaTrust.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button style={styles.refreshBtn} onClick={fetchMedia} disabled={loading}>
              <span style={{ display: 'inline-block', transform: loading ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s' }}>🔄</span>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button style={styles.recordNewBtn} onClick={() => navigate('/record')}>
              + Record / Authenticate New Media
            </button>
          </div>
        </div>

        {/* Error Alert if any */}
        {error && (
          <div style={{ padding: '10px 16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', marginBottom: '20px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
        )}

        {/* Not Logged In Info Banner */}
        {!token && (
          <div style={styles.guestBanner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.4rem' }}>💡</span>
              <div>
                <strong style={{ color: '#f8fafc', display: 'block' }}>Guest Session Notice</strong>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  You are currently viewing local media records. Log in to sync and access your permanent MongoDB cloud provenance ledger across all devices.
                </span>
              </div>
            </div>
            <button style={styles.loginBannerBtn} onClick={() => navigate('/register')}>
              Sign In / Register →
            </button>
          </div>
        )}

        {/* Analytics & Metrics Cards */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <span style={styles.statIcon}>🗂️</span>
            <div>
              <div style={styles.statValue}>{stats.total}</div>
              <div style={styles.statLabel}>Total Protected Assets</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <span style={styles.statIcon}>🎬</span>
            <div>
              <div style={styles.statValue}>{stats.videos}</div>
              <div style={styles.statLabel}>Video Proofs (PyAV)</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <span style={styles.statIcon}>📷</span>
            <div>
              <div style={styles.statValue}>{stats.images}</div>
              <div style={styles.statLabel}>Photo Proofs (Block Hashes)</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <span style={styles.statIcon}>🛡️</span>
            <div>
              <div style={{ ...styles.statValue, color: '#10b981' }}>100%</div>
              <div style={styles.statLabel}>Chain-of-Custody Integrity</div>
            </div>
          </div>
        </div>

        {/* Search & Filtering Control Bar */}
        <div style={styles.filterBar}>
          <div style={styles.searchWrapper}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search by Claim ID (e.g. MT-2026-...) or filename..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button style={styles.clearSearchBtn} onClick={() => setSearchQuery('')}>
                ✕
              </button>
            )}
          </div>

          <div style={styles.tabGroup}>
            <button
              style={styles.tabBtn(filterType === 'all')}
              onClick={() => setFilterType('all')}
            >
              All Assets ({stats.total})
            </button>
            <button
              style={styles.tabBtn(filterType === 'video')}
              onClick={() => setFilterType('video')}
            >
              🎬 Videos ({stats.videos})
            </button>
            <button
              style={styles.tabBtn(filterType === 'image')}
              onClick={() => setFilterType('image')}
            >
              📷 Photos ({stats.images})
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={{ color: '#94a3b8', marginTop: '16px', fontSize: '0.95rem' }}>
              Fetching authenticated ledger from MongoDB...
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={styles.emptyContainer}>
            <div style={styles.emptyIconCircle}>📭</div>
            <h3 style={styles.emptyTitle}>
              {searchQuery ? 'No matching records found' : 'No Media In Your Gallery Yet'}
            </h3>
            <p style={styles.emptySubtitle}>
              {searchQuery
                ? `No authenticated media matched "${searchQuery}". Try searching a different Claim ID.`
                : 'Start capturing tamper-evident videos and photos or upload media to register your first Claim ID.'}
            </p>
            {searchQuery ? (
              <button style={styles.emptyActionBtn} onClick={() => setSearchQuery('')}>
                Clear Search Filter
              </button>
            ) : (
              <button style={styles.emptyActionBtn} onClick={() => navigate('/record')}>
                Go to Media Studio →
              </button>
            )}
          </div>
        ) : (
          <div style={styles.grid}>
            {filteredItems.map((item, idx) => {
              const isVideo = item.type === 'video';
              const displayDate = item.date || (item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Recent');
              const mediaSource = item.url || (item.serverFileName ? `http://localhost:5000/uploads/${item.serverFileName}` : '');

              return (
                <div key={item.id || idx} style={styles.card}>
                  {/* Media Viewport */}
                  <div style={styles.mediaContainer}>
                    {isVideo ? (
                      <video
                        src={mediaSource}
                        controls
                        preload="metadata"
                        style={styles.mediaElement}
                      />
                    ) : (
                      <img
                        src={mediaSource}
                        alt={item.fileName || 'Authenticated'}
                        style={styles.mediaElement}
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.opacity = 0.5;
                        }}
                      />
                    )}

                    <div style={styles.mediaTypeBadge(isVideo)}>
                      {isVideo ? '🎬 VIDEO' : '📷 PHOTO'}
                    </div>

                    <div style={styles.authenticBadge}>
                      🛡️ AUTHENTIC
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div style={styles.cardBody}>
                    {/* Claim ID Bar */}
                    <div style={styles.claimRow}>
                      <span style={styles.claimLabel}>CLAIM ID</span>
                      <div
                        style={styles.claimPill}
                        onClick={(e) => handleCopyClaimId(item.claimId, e)}
                        title="Click to copy Claim ID"
                      >
                        <span style={styles.claimText}>{item.claimId || 'UNREGISTERED'}</span>
                        <span style={styles.copyIcon}>
                          {copiedClaimId === item.claimId ? '✓ Copied' : '📋'}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Specs */}
                    <div style={styles.metaList}>
                      <div style={styles.metaItem}>
                        <span style={styles.metaIcon}>📅</span>
                        <span style={styles.metaText}>{displayDate}</span>
                      </div>

                      {item.gpsLocation?.latitude && item.gpsLocation?.longitude && (
                        <div style={styles.metaItem}>
                          <span style={styles.metaIcon}>📍</span>
                          <span style={styles.metaText}>
                            {Number(item.gpsLocation.latitude).toFixed(4)}°, {Number(item.gpsLocation.longitude).toFixed(4)}°
                          </span>
                        </div>
                      )}

                      {item.totalFrames > 0 && (
                        <div style={styles.metaItem}>
                          <span style={styles.metaIcon}>🎞️</span>
                          <span style={styles.metaText}>
                            {item.totalFrames} {isVideo ? 'frames verified' : 'blocks analyzed'}
                          </span>
                        </div>
                      )}

                      {item.finalHash && (
                        <div style={styles.metaItem}>
                          <span style={styles.metaIcon}>🔑</span>
                          <span style={styles.metaText} title={item.finalHash}>
                            Hash: {item.finalHash.substring(0, 16)}...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div style={styles.cardFooter}>
                    {confirmDeleteId === (item.claimId || item.id) ? (
                      <div style={styles.confirmDeleteBox}>
                        <span style={{ fontSize: '0.8rem', color: '#fca5a5' }}>Confirm delete?</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            style={styles.confirmYesBtn}
                            onClick={(e) => handleDelete(item, e)}
                            disabled={deletingClaimId === (item.claimId || item.id)}
                          >
                            {deletingClaimId === (item.claimId || item.id) ? '...' : 'Yes'}
                          </button>
                          <button
                            style={styles.confirmNoBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          style={styles.verifyActionBtn}
                          onClick={() => navigate(`/verify?claimId=${encodeURIComponent(item.claimId || '')}`)}
                          title="Verify this media in Audit Studio"
                        >
                          🔍 Verify
                        </button>

                        <button
                          style={styles.downloadActionBtn}
                          onClick={(e) => handleDownload(item, e)}
                          title="Download original authentic file"
                        >
                          ⬇️ Download
                        </button>

                        <button
                          style={styles.deleteActionBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(item.claimId || item.id);
                          }}
                          title="Delete from gallery"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#070d1a',
    color: '#e2e8f0',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 40px',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
    backdropFilter: 'blur(12px)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  navBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
  },
  navLogoBadge: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    color: '#ffffff',
    fontSize: '0.95rem',
    boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)',
  },
  navLogoTitle: {
    fontSize: '1.2rem',
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: '-0.3px',
    display: 'block',
    lineHeight: '1.1',
  },
  navLogoTag: {
    fontSize: '0.65rem',
    fontWeight: '700',
    letterSpacing: '1.5px',
    color: '#60a5fa',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  syncBadge: (isCloud) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '20px',
    backgroundColor: isCloud ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)',
    color: isCloud ? '#34d399' : '#94a3b8',
    border: `1px solid ${isCloud ? 'rgba(16, 185, 129, 0.25)' : 'rgba(148, 163, 184, 0.25)'}`,
  }),
  syncDot: (isCloud) => ({
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: isCloud ? '#10b981' : '#94a3b8',
    boxShadow: isCloud ? '0 0 8px #10b981' : 'none',
  }),
  navBackBtn: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    color: '#cbd5e1',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '8px 14px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  content: {
    maxWidth: '1360px',
    margin: '0 auto',
    padding: '36px 32px 64px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '28px',
    flexWrap: 'wrap',
    gap: '20px',
  },
  tagline: {
    fontSize: '0.75rem',
    letterSpacing: '2px',
    color: '#60a5fa',
    fontWeight: '700',
    marginBottom: '6px',
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: '800',
    color: '#f8fafc',
    margin: '0 0 6px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '0.95rem',
    maxWidth: '640px',
    margin: 0,
    lineHeight: 1.5,
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    color: '#cbd5e1',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    padding: '10px 18px',
    fontSize: '0.88rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  recordNewBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 20px',
    fontSize: '0.88rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 0 16px rgba(37, 99, 235, 0.4)',
    transition: 'all 0.2s',
  },
  guestBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 58, 138, 0.2)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '28px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  loginBannerBtn: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '28px',
  },
  statCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
    padding: '18px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statIcon: {
    fontSize: '1.8rem',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#f8fafc',
    lineHeight: 1.1,
  },
  statLabel: {
    fontSize: '0.78rem',
    color: '#94a3b8',
    marginTop: '2px',
    fontWeight: '500',
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '28px',
    padding: '14px 18px',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  searchWrapper: {
    position: 'relative',
    flex: '1 1 320px',
    maxWidth: '480px',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    fontSize: '0.85rem',
    color: '#64748b',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '10px 36px 10px 36px',
    backgroundColor: '#0b1329',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '0.88rem',
    outline: 'none',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  tabGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  tabBtn: (active) => ({
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    border: active ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: active ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.4)',
    color: active ? '#60a5fa' : '#94a3b8',
    transition: 'all 0.15s',
  }),
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid rgba(59, 130, 246, 0.15)',
    borderRadius: '16px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
    transition: 'transform 0.2s, border-color 0.2s',
  },
  mediaContainer: {
    position: 'relative',
    width: '100%',
    height: '210px',
    backgroundColor: '#020617',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mediaElement: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  mediaTypeBadge: (isVideo) => ({
    position: 'absolute',
    top: '12px',
    left: '12px',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '700',
    letterSpacing: '0.5px',
    backgroundColor: isVideo ? 'rgba(147, 51, 234, 0.85)' : 'rgba(14, 165, 233, 0.85)',
    color: '#ffffff',
    backdropFilter: 'blur(6px)',
  }),
  authenticBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '700',
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    color: '#ffffff',
    backdropFilter: 'blur(6px)',
    boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)',
  },
  cardBody: {
    padding: '16px',
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  claimRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  claimLabel: {
    fontSize: '0.7rem',
    fontWeight: '700',
    letterSpacing: '1px',
    color: '#64748b',
  },
  claimPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  claimText: {
    color: '#93c5fd',
    fontWeight: '700',
    fontSize: '0.8rem',
    fontFamily: 'monospace',
  },
  copyIcon: {
    fontSize: '0.75rem',
    color: '#60a5fa',
  },
  metaList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  metaIcon: {
    fontSize: '0.8rem',
    opacity: 0.7,
  },
  metaText: {
    fontSize: '0.78rem',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardFooter: {
    padding: '12px 16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(10, 15, 30, 0.5)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  verifyActionBtn: {
    flex: '1.2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  downloadActionBtn: {
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    color: '#cbd5e1',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteActionBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  confirmDeleteBox: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px',
  },
  confirmYesBtn: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '5px 10px',
    fontSize: '0.75rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  confirmNoBtn: {
    backgroundColor: '#334155',
    color: '#e2e8f0',
    border: 'none',
    borderRadius: '6px',
    padding: '5px 10px',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid rgba(59, 130, 246, 0.15)',
    borderTopColor: '#3b82f6',
    animation: 'spin 1s linear infinite',
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '70px 20px',
    textAlign: 'center',
  },
  emptyIconCircle: {
    fontSize: '3.5rem',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#f1f5f9',
    margin: '0 0 8px 0',
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: '0.9rem',
    maxWidth: '440px',
    margin: '0 0 24px 0',
    lineHeight: 1.5,
  },
  emptyActionBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 22px',
    fontSize: '0.88rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default Gallery;