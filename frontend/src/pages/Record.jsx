import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NotificationCenter from '../components/NotificationCenter';

function Record() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('record');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('mediatrust_token') || '');
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('mediatrust_token'));
  const [userName, setUserName] = useState('');

  const [cameraMode, setCameraMode] = useState('video');
  const [recording, setRecording] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedMedia, setCapturedMedia] = useState(null);
  const [capturedType, setCapturedType] = useState(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [declaration, setDeclaration] = useState(false);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showSavePopup, setShowSavePopup] = useState(false);
  const [pendingMedia, setPendingMedia] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('mediatrust_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setUserName(u.name || '');
      } catch {}
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleLogin = async () => {
    try {
      setError('');
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });
      setToken(res.data.token);
      setUserName(res.data.name || '');
      setLoggedIn(true);
      localStorage.setItem('mediatrust_token', res.data.token);
      localStorage.setItem('mediatrust_user', JSON.stringify({ userId: res.data.userId, name: res.data.name }));
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mediatrust_token');
    localStorage.removeItem('mediatrust_user');
    setToken('');
    setUserName('');
    setLoggedIn(false);
  };

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: cameraMode === 'video'
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setCapturedMedia(null);
      setResult(null);
    } catch (err) {
      setError('Could not access camera. Please allow camera permission.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setRecording(false);
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setCapturedMedia({ blob, url, type: 'video' });
      setCapturedType('video');
      setPendingMedia({ blob, url, type: 'video' });
    };

    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    stopCamera();
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      setCapturedMedia({ blob, url, type: 'image' });
      setCapturedType('image');
      setPendingMedia({ blob, url, type: 'image' });
      stopCamera();
    }, 'image/png');
  };

  const saveToGallery = (mediaObj, type, claimId) => {
    const filename = type === 'video'
      ? `MediaTrust_Video_${claimId || new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`
      : `MediaTrust_Photo_${claimId || new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;

    const item = {
      url: mediaObj.url || (mediaObj.blob ? URL.createObjectURL(mediaObj.blob) : ''),
      serverFileName: mediaObj.serverFileName,
      filename,
      type,
      date: new Date().toLocaleString(),
      claimId: claimId || mediaObj.claimId || null,
    };

    const existing = JSON.parse(localStorage.getItem('mediatrust_gallery') || '[]');
    existing.unshift(item);
    localStorage.setItem('mediatrust_gallery', JSON.stringify(existing));
  };

  const handleSaveToDevice = async () => {
    if (!pendingMedia) return;
    const filename = pendingMedia.type === 'video'
      ? `MediaTrust_${pendingMedia.claimId || 'Video'}.webm`
      : `MediaTrust_${pendingMedia.claimId || 'Photo'}.png`;

    try {
      if (pendingMedia.blob) {
        const blobUrl = URL.createObjectURL(pendingMedia.blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(blobUrl);
      } else if (pendingMedia.url && pendingMedia.url.startsWith('http')) {
        const response = await fetch(pendingMedia.url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(blobUrl);
      } else if (pendingMedia.url) {
        const a = document.createElement('a');
        a.href = pendingMedia.url;
        a.download = filename;
        a.click();
      }
    } catch (e) {
      if (pendingMedia.url) {
        const a = document.createElement('a');
        a.href = pendingMedia.url;
        a.download = filename;
        a.click();
      }
    }
    setShowSavePopup(false);
    setPendingMedia(null);
  };

  const handleSaveToGallery = () => {
    if (!pendingMedia) return;
    saveToGallery(pendingMedia, pendingMedia.type, result?.claimId || pendingMedia.claimId);
    setShowSavePopup(false);
    setPendingMedia(null);
    alert('✅ Saved to MediaTrust Gallery!');
  };

  const handleSaveBoth = async () => {
    if (!pendingMedia) return;
    await handleSaveToDevice();
    saveToGallery(pendingMedia, pendingMedia.type, result?.claimId || pendingMedia.claimId);
    setShowSavePopup(false);
    setPendingMedia(null);
  };

  const handleCapturedUpload = async () => {
    if (!capturedMedia) return;
    if (!declaration) {
      setError('Please accept the declaration.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let latitude = '12.8628'; // Fallback to Mangalore/Karnataka region if blocked
      let longitude = '74.8516';
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: true })
        );
        latitude = pos.coords.latitude.toString();
        longitude = pos.coords.longitude.toString();
      } catch (err) {
        console.warn('Geolocation blocked or timed out, using fallback.', err);
      }

      const fileName = capturedType === 'video' ? 'recorded_video.webm' : 'captured_photo.png';
      const file = new File([capturedMedia.blob], fileName, {
        type: capturedType === 'video' ? 'video/webm' : 'image/png'
      });

      const formData = new FormData();
      formData.append('media', file);
      formData.append('mediaType', capturedType);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('deviceId', 'DEVICE-' + Math.random().toString(36).substr(2, 9));
      formData.append('sessionId', 'SESSION-' + Math.random().toString(36).substr(2, 9));

      const res = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setResult(res.data);
      const serverFileName = res.data.fileName;
      const watermarkedUrl = `http://localhost:5000/uploads/${serverFileName}`;

      setPendingMedia({
        blob: capturedMedia.blob,
        url: watermarkedUrl,
        serverFileName: serverFileName,
        type: capturedType,
        claimId: res.data.claimId
      });

      // Show popup AFTER successful upload
      setShowSavePopup(true);

    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file.');
      return;
    }
    if (!declaration) {
      setError('Please accept the declaration.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('media', selectedFile);
      formData.append('mediaType', selectedFile.type.includes('video') ? 'video' : 'image');
      let latitude = '12.8628'; // Fallback
      let longitude = '74.8516';
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: true })
        );
        latitude = pos.coords.latitude.toString();
        longitude = pos.coords.longitude.toString();
      } catch (err) {
        console.warn('Geolocation blocked or timed out, using fallback.', err);
      }

      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('deviceId', 'DEVICE-' + Math.random().toString(36).substr(2, 9));
      formData.append('sessionId', 'SESSION-' + Math.random().toString(36).substr(2, 9));

      const res = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setResult(res.data);
      const serverFileName = res.data.fileName;
      const watermarkedUrl = `http://localhost:5000/uploads/${serverFileName}`;

      setPendingMedia({
        blob: selectedFile,
        url: watermarkedUrl,
        serverFileName: serverFileName,
        type: selectedFile.type.includes('video') ? 'video' : 'image',
        claimId: res.data.claimId
      });

      setShowSavePopup(true);
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>

      {/* Save Popup — fixed overlay outside everything */}
      {showSavePopup && (
        <div style={styles.popupOverlay}>
          <div style={styles.popup}>
            <div style={styles.popupIcon}>
              {pendingMedia?.type === 'video' ? '🎬' : '📸'}
            </div>
            <h3 style={styles.popupTitle}>
              {pendingMedia?.type === 'video' ? 'Video Authenticated!' : 'Photo Authenticated!'}
            </h3>
            <p style={styles.popupClaimId}>
              🔖 Claim ID: <strong>{result?.claimId}</strong>
            </p>
            <p style={styles.popupSubtitle}>Where would you like to save your media?</p>
            <button style={styles.popupBtnPrimary} onClick={handleSaveToDevice}>
              💾 Save to Device
            </button>
            <button style={styles.popupBtnSecondary} onClick={handleSaveToGallery}>
              📁 Save to App Gallery
            </button>
            <button style={styles.popupBtnBoth} onClick={handleSaveBoth}>
              ✅ Save to Both
            </button>
            <button style={styles.popupBtnSkip} onClick={() => { setShowSavePopup(false); setPendingMedia(null); }}>
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.navLogo} onClick={() => { stopCamera(); navigate('/'); }}>
          <div style={styles.navLogoIcon}>MT</div>
          <span style={styles.navLogoText}>MediaTrust</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <NotificationCenter />
          <button style={styles.navBackBtn} onClick={() => { stopCamera(); navigate('/'); }}>← Back to Home</button>
        </div>
      </nav>

      <div style={styles.content}>
        <div style={styles.formPanel}>
          <div style={styles.headerBlock}>
            <h2 style={styles.title}>Capture & Authenticate</h2>
            <p style={styles.subtitle}>Record in-app or upload a file to generate a verified Claim ID.</p>
          </div>

          {/* Tab Switcher */}
          <div style={styles.tabRow}>
            <button
              style={activeTab === 'record' ? styles.tabActive : styles.tabInactive}
              onClick={() => { setActiveTab('record'); stopCamera(); setResult(null); setError(''); }}
            >
              Record In-App
            </button>
            <button
              style={activeTab === 'upload' ? styles.tabActive : styles.tabInactive}
              onClick={() => { setActiveTab('upload'); stopCamera(); setResult(null); setError(''); }}
            >
              Upload File
            </button>
          </div>

          {/* Login Section */}
          {!loggedIn ? (
            <div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Email</label>
                <input style={styles.input} type="email" placeholder="Your email"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Password</label>
                <input style={styles.input} type="password" placeholder="Your password"
                  value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              {error && <p style={styles.error}>{error}</p>}
              <button style={styles.primaryBtn} onClick={handleLogin}>Login</button>
              <p style={styles.registerText}>
                Don't have an account?{' '}
                <span style={styles.link} onClick={() => navigate('/register')}>Register</span>
              </p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ ...styles.success, margin: 0 }}>✅ Logged in as {userName || 'Creator'}</p>
                <button
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>

              {/* RECORD IN-APP TAB */}
              {activeTab === 'record' && (
                <div>
                  <div style={styles.modeRow}>
                    <button
                      style={cameraMode === 'video' ? styles.modeActive : styles.modeInactive}
                      onClick={() => { setCameraMode('video'); stopCamera(); setCapturedMedia(null); }}
                    >Video</button>
                    <button
                      style={cameraMode === 'photo' ? styles.modeActive : styles.modeInactive}
                      onClick={() => { setCameraMode('photo'); stopCamera(); setCapturedMedia(null); }}
                    >Photo</button>
                  </div>

                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{
                      ...styles.videoPreview,
                      display: cameraActive ? 'block' : 'none'
                    }}
                  />

                  {capturedMedia && !cameraActive && (
                    <div style={styles.previewBox}>
                      <p style={styles.label}>Captured — Preview</p>
                      {capturedMedia.type === 'video' ? (
                        <video src={capturedMedia.url} controls style={styles.videoPreview} />
                      ) : (
                        <img src={capturedMedia.url} alt="Captured" style={styles.videoPreview} />
                      )}
                    </div>
                  )}

                  {!cameraActive && !capturedMedia && (
                    <button style={styles.primaryBtn} onClick={startCamera}>
                      {cameraMode === 'video' ? 'Start Camera' : 'Open Camera'}
                    </button>
                  )}

                  {cameraActive && cameraMode === 'video' && !recording && (
                    <button style={{ ...styles.primaryBtn, backgroundColor: '#ef4444', boxShadow: '0 4px 24px rgba(239,68,68,0.3)' }} onClick={startRecording}>
                      Start Recording
                    </button>
                  )}

                  {cameraActive && cameraMode === 'video' && recording && (
                    <button style={{ ...styles.primaryBtn, backgroundColor: '#f59e0b', boxShadow: '0 4px 24px rgba(245,158,11,0.3)' }} onClick={stopRecording}>
                      Stop Recording
                    </button>
                  )}

                  {cameraActive && cameraMode === 'photo' && (
                    <button style={{ ...styles.primaryBtn, backgroundColor: '#10b981', boxShadow: '0 4px 24px rgba(16,185,129,0.3)' }} onClick={capturePhoto}>
                      Capture Photo
                    </button>
                  )}

                  {capturedMedia && (
                    <button style={styles.secondaryBtn} onClick={() => { setCapturedMedia(null); setResult(null); setPendingMedia(null); }}>
                      Retake
                    </button>
                  )}

                  {capturedMedia && (
                    <div>
                      <div style={styles.declarationBox}>
                        <input type="checkbox" id="declaration" checked={declaration}
                          onChange={e => setDeclaration(e.target.checked)} />
                        <label htmlFor="declaration" style={styles.declarationText}>
                          I confirm this media is authentic and I am accountable for this submission.
                        </label>
                      </div>
                      {error && <p style={styles.error}>{error}</p>}
                      <button style={styles.primaryBtn} onClick={handleCapturedUpload} disabled={loading}>
                        {loading ? 'Uploading...' : 'Authenticate & Submit'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* UPLOAD FILE TAB */}
              {activeTab === 'upload' && (
                <div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Select Video or Photo</label>
                    <input style={styles.fileInput} type="file" accept="video/*,image/*"
                      onChange={e => setSelectedFile(e.target.files[0])} />
                    {selectedFile && <p style={styles.fileName}>{selectedFile.name}</p>}
                  </div>
                  <div style={styles.declarationBox}>
                    <input type="checkbox" id="declaration2" checked={declaration}
                      onChange={e => setDeclaration(e.target.checked)} />
                    <label htmlFor="declaration2" style={styles.declarationText}>
                      I confirm this media is authentic and I am accountable for this submission.
                    </label>
                  </div>
                  {error && <p style={styles.error}>{error}</p>}
                  <button style={styles.primaryBtn} onClick={handleUpload} disabled={loading}>
                    {loading ? 'Uploading...' : 'Upload & Authenticate'}
                  </button>
                </div>
              )}

              {/* Result */}
              {result && (
                <div style={styles.resultBox}>
                  <h3 style={styles.resultTitle}>✅ Upload Successful</h3>
                  <p style={styles.resultText}>Claim ID: <strong>{result.claimId}</strong></p>
                  <p style={styles.resultText}>File Hash: <strong>{result.fileHash?.substring(0, 20)}...</strong></p>
                  <p style={styles.resultNote}>💾 Save your Claim ID to verify later.</p>
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
  popupOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(6px)',
  },
  popup: {
    backgroundColor: '#1e293b',
    borderRadius: '20px',
    padding: '40px 32px',
    maxWidth: '380px',
    width: '90%',
    border: '1px solid rgba(59,130,246,0.25)',
    boxShadow: '0 0 60px rgba(59,130,246,0.15), 0 25px 50px rgba(0,0,0,0.6)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  popupIcon: {
    fontSize: '3.5rem',
  },
  popupTitle: {
    color: '#f1f5f9',
    fontSize: '1.4rem',
    fontWeight: '700',
    margin: 0,
    textAlign: 'center',
  },
  popupClaimId: {
    color: '#3b82f6',
    fontSize: '0.9rem',
    margin: 0,
    textAlign: 'center',
    backgroundColor: 'rgba(59,130,246,0.1)',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(59,130,246,0.2)',
    width: '100%',
    boxSizing: 'border-box',
  },
  popupSubtitle: {
    color: '#64748b',
    fontSize: '0.88rem',
    margin: '0 0 4px 0',
    textAlign: 'center',
  },
  popupBtnPrimary: {
    width: '100%',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '13px',
    fontSize: '0.95rem',
    cursor: 'pointer',
    fontWeight: '600',
    boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
  },
  popupBtnSecondary: {
    width: '100%',
    backgroundColor: '#7c3aed',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '13px',
    fontSize: '0.95rem',
    cursor: 'pointer',
    fontWeight: '600',
    boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
  },
  popupBtnBoth: {
    width: '100%',
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '13px',
    fontSize: '0.95rem',
    cursor: 'pointer',
    fontWeight: '600',
    boxShadow: '0 4px 16px rgba(5,150,105,0.3)',
  },
  popupBtnSkip: {
    backgroundColor: 'transparent',
    color: '#475569',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.85rem',
    marginTop: '4px',
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
    marginBottom: '28px',
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
  tabRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
  },
  tabActive: {
    flex: 1,
    padding: '11px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
  },
  tabInactive: {
    flex: 1,
    padding: '11px',
    backgroundColor: 'transparent',
    color: '#64748b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  modeRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  modeActive: {
    flex: 1,
    padding: '9px',
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.85rem',
  },
  modeInactive: {
    flex: 1,
    padding: '9px',
    backgroundColor: 'transparent',
    color: '#64748b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  videoPreview: {
    width: '100%',
    borderRadius: '10px',
    marginBottom: '12px',
    backgroundColor: '#000',
  },
  previewBox: {
    marginBottom: '12px',
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
  secondaryBtn: {
    width: '100%',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    marginTop: '8px',
  },
  declarationBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: '14px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.06)',
    marginBottom: '16px',
    marginTop: '16px',
  },
  declarationText: {
    color: '#94a3b8',
    fontSize: '0.85rem',
    lineHeight: '1.5',
  },
  error: {
    color: '#ef4444',
    fontSize: '0.85rem',
    marginBottom: '8px',
  },
  success: {
    color: '#10b981',
    fontSize: '0.9rem',
    marginBottom: '20px',
  },
  resultBox: {
    backgroundColor: 'rgba(16,185,129,0.06)',
    borderRadius: '12px',
    padding: '18px',
    marginTop: '20px',
    border: '1px solid rgba(16,185,129,0.3)',
  },
  resultTitle: {
    color: '#10b981',
    fontSize: '1rem',
    fontWeight: '700',
    margin: '0 0 10px 0',
  },
  resultText: {
    color: '#f1f5f9',
    fontSize: '0.88rem',
    marginBottom: '4px',
  },
  resultNote: {
    color: '#f59e0b',
    fontSize: '0.82rem',
    marginTop: '10px',
  },
  registerText: {
    color: '#64748b',
    fontSize: '0.85rem',
    marginTop: '16px',
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

export default Record;