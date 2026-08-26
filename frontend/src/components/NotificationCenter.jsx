import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function NotificationCenter({ onLoginRequired }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const panelRef = useRef(null);

  const token = localStorage.getItem('mediatrust_token');

  useEffect(() => {
    const storedUser = localStorage.getItem('mediatrust_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    const curToken = localStorage.getItem('mediatrust_token');
    if (!curToken) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const res = await axios.get('http://localhost:5000/api/notifications', {
        headers: { Authorization: `Bearer ${curToken}` }
      });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('mediatrust_token');
        localStorage.removeItem('mediatrust_user');
        setUser(null);
      }
    }
  };

  // Poll for notifications periodically
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  // Close when clicking outside panel
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest('.notif-toggle-btn')) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    const curToken = localStorage.getItem('mediatrust_token');
    if (!curToken) return;

    try {
      await axios.patch(`http://localhost:5000/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${curToken}` }
      });
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    const curToken = localStorage.getItem('mediatrust_token');
    if (!curToken) return;

    try {
      setLoading(true);
      await axios.patch('http://localhost:5000/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${curToken}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    const curToken = localStorage.getItem('mediatrust_token');
    if (!curToken) return;

    try {
      await axios.delete(`http://localhost:5000/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${curToken}` }
      });
      const deleted = notifications.find(n => n._id === id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (deleted && !deleted.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      if (selectedNotif?._id === id) setSelectedNotif(null);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleClearAll = async () => {
    const curToken = localStorage.getItem('mediatrust_token');
    if (!curToken) return;

    try {
      setLoading(true);
      await axios.delete('http://localhost:5000/api/notifications/clear-all', {
        headers: { Authorization: `Bearer ${curToken}` }
      });
      setNotifications([]);
      setUnreadCount(0);
      setSelectedNotif(null);
    } catch (err) {
      console.error('Failed to clear all:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSecs = Math.floor((now - date) / 1000);

    if (diffSecs < 60) return 'Just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    if (diffSecs < 604800) return `${Math.floor(diffSecs / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell Button */}
      <button
        className="notif-toggle-btn"
        style={styles.bellBtn}
        onClick={() => {
          setIsOpen(!isOpen);
          fetchNotifications();
        }}
        title="Access Notifications"
      >
        <span style={styles.bellIcon}>🔔</span>
        {unreadCount > 0 && (
          <span style={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-out / Dropdown Panel */}
      {isOpen && (
        <div ref={panelRef} style={styles.panel}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <span style={styles.headerTitle}>Access Alerts{user?.name ? ` (${user.name})` : ''}</span>
              {unreadCount > 0 && (
                <span style={styles.unreadPill}>{unreadCount} new</span>
              )}
            </div>
            <div style={styles.headerRight}>
              {notifications.length > 0 && (
                <>
                  {unreadCount > 0 && (
                    <button
                      style={styles.actionLink}
                      onClick={handleMarkAllRead}
                      disabled={loading}
                      title="Mark all as read"
                    >
                      ✓ Read all
                    </button>
                  )}
                  <button
                    style={styles.clearLink}
                    onClick={handleClearAll}
                    disabled={loading}
                    title="Clear all alerts"
                  >
                    Clear
                  </button>
                </>
              )}
              <button style={styles.closeBtn} onClick={() => setIsOpen(false)}>✕</button>
            </div>
          </div>

          {/* Body */}
          <div style={styles.body}>
            {!token ? (
              <div style={styles.authNotice}>
                <p style={styles.authNoticeIcon}>🔒</p>
                <p style={styles.authNoticeTitle}>Log In to See Access Alerts</p>
                <p style={styles.authNoticeDesc}>
                  You'll be notified automatically whenever an auditor or user verifies your uploaded media.
                </p>
                <button
                  style={styles.loginBtn}
                  onClick={() => {
                    setIsOpen(false);
                    if (onLoginRequired) onLoginRequired();
                    else window.location.href = '/record';
                  }}
                >
                  Log In / Sign Up
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyIcon}>🛡️</p>
                <p style={styles.emptyTitle}>No Access Events Yet</p>
                <p style={styles.emptyDesc}>
                  Whenever someone verifies your registered photos or videos using your Claim ID, you'll receive immediate transparency alerts right here.
                </p>
              </div>
            ) : (
              <div style={styles.notifList}>
                {notifications.map(notif => {
                  const isDownload = notif.eventType === 'DOWNLOAD' || notif.verdict === 'MEDIA DOWNLOADED';
                  const isAuthentic = notif.verdict === 'AUTHENTIC MEDIA';
                  
                  let borderCol = '#ef4444';
                  if (isDownload) borderCol = '#6366f1';
                  else if (isAuthentic) borderCol = '#22c55e';

                  return (
                    <div
                      key={notif._id}
                      style={{
                        ...styles.card,
                        backgroundColor: notif.isRead
                          ? 'rgba(15, 23, 42, 0.6)'
                          : 'rgba(30, 41, 59, 0.9)',
                        borderLeft: notif.isRead
                          ? '3px solid transparent'
                          : `3px solid ${borderCol}`
                      }}
                      onClick={() => {
                        if (!notif.isRead) handleMarkAsRead(notif._id);
                        setSelectedNotif(selectedNotif?._id === notif._id ? null : notif);
                      }}
                    >
                      <div style={styles.cardHeader}>
                        <div style={styles.cardHeaderLeft}>
                          <span style={styles.mediaIcon}>
                            {isDownload ? '📥' : notif.mediaType === 'image' ? '🖼️' : '📹'}
                          </span>
                          <div>
                            <div style={styles.claimTitle}>
                              <span style={styles.claimCode}>{notif.claimId}</span>
                              {!notif.isRead && <span style={styles.unreadDot} />}
                            </div>
                            <span style={styles.relativeTime}>{formatRelativeTime(notif.createdAt)}</span>
                          </div>
                        </div>

                        <div style={styles.cardHeaderRight}>
                          <span
                            style={{
                              ...styles.verdictBadge,
                              backgroundColor: isDownload
                                ? 'rgba(99,102,241,0.15)'
                                : isAuthentic
                                ? 'rgba(34,197,94,0.15)'
                                : 'rgba(239,68,68,0.15)',
                              color: isDownload ? '#a5b4fc' : isAuthentic ? '#4ade80' : '#f87171',
                              border: isDownload
                                ? '1px solid rgba(99,102,241,0.3)'
                                : `1px solid ${isAuthentic ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`
                            }}
                          >
                            {isDownload ? '⬇️ DOWNLOADED' : isAuthentic ? '✓ AUTHENTIC' : '⚠ TAMPERED'}
                          </span>
                        </div>
                      </div>

                      <div style={styles.cardMessage}>
                        {isDownload ? (
                          <><strong>{notif.verifierName}</strong> downloaded this {notif.mediaType || 'media'} from the gallery.</>
                        ) : (
                          <>
                            <strong>{notif.verifierName}</strong> verified this {notif.mediaType || 'media'}.
                            {!isAuthentic && notif.tamperPercentage > 0 && (
                              <span style={styles.tamperDetail}> ({notif.tamperPercentage}% altered)</span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Expandable audit metadata */}
                      {selectedNotif?._id === notif._id && (
                        <div style={styles.expandedDetails}>
                          <div style={styles.detailRow}>
                            <span style={styles.detailKey}>{isDownload ? 'Downloaded At:' : 'Verified At:'}</span>
                            <span style={styles.detailVal}>
                              {new Date(notif.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div style={styles.detailRow}>
                            <span style={styles.detailKey}>{isDownload ? 'Downloader:' : 'Auditor:'}</span>
                            <span style={styles.detailVal}>{notif.verifierName}</span>
                          </div>
                          <div style={styles.detailRow}>
                            <span style={styles.detailKey}>{isDownload ? 'Event:' : 'Audit Verdict:'}</span>
                            <span style={{
                              ...styles.detailVal,
                              color: isDownload ? '#a5b4fc' : isAuthentic ? '#4ade80' : '#f87171',
                              fontWeight: '700'
                            }}>
                              {notif.verdict}
                            </span>
                          </div>
                          {notif.ipAddress && (
                            <div style={styles.detailRow}>
                              <span style={styles.detailKey}>Client IP:</span>
                              <span style={styles.detailVal}>{notif.ipAddress}</span>
                            </div>
                          )}
                          <div style={styles.detailActions}>
                            <button
                              style={styles.cardDeleteBtn}
                              onClick={(e) => handleDelete(notif._id, e)}
                            >
                              🗑️ Delete Alert
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {token && (
            <div style={styles.footer}>
              <span style={styles.footerText}>
                🔐 Source-Level Media Provenance Security
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  bellBtn: {
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    padding: '8px 12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  bellIcon: {
    fontSize: '1.15rem',
  },
  badge: {
    position: 'absolute',
    top: '-5px',
    right: '-5px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '0.7rem',
    fontWeight: '800',
    borderRadius: '999px',
    padding: '2px 6px',
    minWidth: '18px',
    textAlign: 'center',
    boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)',
    border: '2px solid #070d1a',
  },
  panel: {
    position: 'absolute',
    top: 'calc(100% + 12px)',
    right: 0,
    width: '380px',
    maxWidth: '90vw',
    maxHeight: '520px',
    backgroundColor: '#0c1322',
    border: '1px solid rgba(59, 130, 246, 0.25)',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(59, 130, 246, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 9999,
    overflow: 'hidden',
    backdropFilter: 'blur(16px)',
    animation: 'fadeIn 0.2s ease',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerTitle: {
    color: '#f1f5f9',
    fontSize: '1rem',
    fontWeight: '700',
  },
  unreadPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#60a5fa',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '999px',
    padding: '2px 8px',
    fontSize: '0.72rem',
    fontWeight: '700',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  actionLink: {
    background: 'none',
    border: 'none',
    color: '#60a5fa',
    fontSize: '0.78rem',
    cursor: 'pointer',
    fontWeight: '600',
    padding: '4px 6px',
  },
  clearLink: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '0.78rem',
    cursor: 'pointer',
    padding: '4px 6px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '2px',
    lineHeight: 1,
  },
  body: {
    overflowY: 'auto',
    flex: 1,
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  authNotice: {
    padding: '30px 20px',
    textAlign: 'center',
  },
  authNoticeIcon: {
    fontSize: '2.5rem',
    margin: '0 0 10px 0',
  },
  authNoticeTitle: {
    color: '#f8fafc',
    fontSize: '1rem',
    fontWeight: '700',
    margin: '0 0 6px 0',
  },
  authNoticeDesc: {
    color: '#64748b',
    fontSize: '0.82rem',
    lineHeight: '1.4',
    margin: '0 0 16px 0',
  },
  loginBtn: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '9px 18px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '2.5rem',
    margin: '0 0 10px 0',
  },
  emptyTitle: {
    color: '#cbd5e1',
    fontSize: '0.95rem',
    fontWeight: '600',
    margin: '0 0 6px 0',
  },
  emptyDesc: {
    color: '#64748b',
    fontSize: '0.8rem',
    lineHeight: '1.4',
    margin: 0,
  },
  notifList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  card: {
    borderRadius: '10px',
    padding: '12px 14px',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  cardHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  mediaIcon: {
    fontSize: '1.1rem',
  },
  claimTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  claimCode: {
    color: '#93c5fd',
    fontWeight: '700',
    fontSize: '0.85rem',
  },
  unreadDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#38bdf8',
    display: 'inline-block',
    boxShadow: '0 0 6px #38bdf8',
  },
  relativeTime: {
    color: '#64748b',
    fontSize: '0.72rem',
  },
  cardHeaderRight: {},
  verdictBadge: {
    fontSize: '0.68rem',
    fontWeight: '800',
    padding: '2px 8px',
    borderRadius: '6px',
    letterSpacing: '0.5px',
  },
  cardMessage: {
    color: '#cbd5e1',
    fontSize: '0.8rem',
    lineHeight: '1.35',
  },
  tamperDetail: {
    color: '#f87171',
    fontWeight: '600',
  },
  expandedDetails: {
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
  },
  detailKey: {
    color: '#64748b',
  },
  detailVal: {
    color: '#cbd5e1',
    fontWeight: '500',
  },
  detailActions: {
    marginTop: '8px',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  cardDeleteBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    fontSize: '0.72rem',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  footer: {
    padding: '8px 16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(10, 15, 30, 0.95)',
    textAlign: 'center',
  },
  footerText: {
    color: '#475569',
    fontSize: '0.7rem',
  },
};

export default NotificationCenter;
