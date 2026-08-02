import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Record() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('record'); // 'record' or 'upload'

  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  // Recording state
  const [cameraMode, setCameraMode] = useState('video'); // 'video' or 'photo'
  const [recording, setRecording] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedMedia, setCapturedMedia] = useState(null);
  const [capturedType, setCapturedType] = useState(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  // Upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [declaration, setDeclaration] = useState(false);

  // Shared state
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cleanup camera on unmount
  useEffect(() => {
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
      setLoggedIn(true);
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    }
  };

  // Start camera
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

  // Stop camera
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

  // Start recording video
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
    };

    mediaRecorder.start();
    setRecording(true);
  };

  // Stop recording video
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    stopCamera();
  };

  // Capture photo
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
      stopCamera();
    }, 'image/png');
  };

  // Upload captured media
  const handleCapturedUpload = async () => {
    if (!capturedMedia) return;
    if (!declaration) {
      setError('Please accept the declaration.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get GPS
      let latitude = '12.9716';
      let longitude = '77.5946';
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        latitude = pos.coords.latitude.toString();
        longitude = pos.coords.longitude.toString();
      } catch {}

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
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Upload file (existing logic)
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
      formData.append('latitude', '12.9716');
      formData.append('longitude', '77.5946');
      formData.append('deviceId', 'DEVICE-' + Math.random().toString(36).substr(2, 9));
      formData.append('sessionId', 'SESSION-' + Math.random().toString(36).substr(2, 9));

      const res = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setResult(res.data);
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <button style={styles.backBtn} onClick={() => { stopCamera(); navigate('/'); }}>← Back</button>
        <h2 style={styles.title}>🎥 MediaTrust Capture</h2>

        {/* Tab Switcher */}
        <div style={styles.tabRow}>
          <button
            style={activeTab === 'record' ? styles.tabActive : styles.tabInactive}
            onClick={() => { setActiveTab('record'); stopCamera(); setResult(null); setError(''); }}
          >
            📷 Record In-App
          </button>
          <button
            style={activeTab === 'upload' ? styles.tabActive : styles.tabInactive}
            onClick={() => { setActiveTab('upload'); stopCamera(); setResult(null); setError(''); }}
          >
            📁 Upload File
          </button>
        </div>

        {/* Login Section */}
        {!loggedIn ? (
          <div>
            <p style={styles.label}>Login to continue</p>
            <input style={styles.input} type="email" placeholder="Email"
              value={email} onChange={e => setEmail(e.target.value)} />
            <input style={styles.input} type="password" placeholder="Password"
              value={password} onChange={e => setPassword(e.target.value)} />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.primaryBtn} onClick={handleLogin}>Login</button>
            <p style={styles.registerText}>
              Don't have an account?{' '}
              <span style={styles.link} onClick={() => navigate('/register')}>Register</span>
            </p>
          </div>
        ) : (
          <div>
            <p style={styles.success}>✅ Logged in successfully</p>

            {/* RECORD IN-APP TAB */}
            {activeTab === 'record' && (
              <div>
                {/* Mode Toggle */}
                <div style={styles.modeRow}>
                  <button
                    style={cameraMode === 'video' ? styles.modeActive : styles.modeInactive}
                    onClick={() => { setCameraMode('video'); stopCamera(); setCapturedMedia(null); }}
                  >🎬 Video</button>
                  <button
                    style={cameraMode === 'photo' ? styles.modeActive : styles.modeInactive}
                    onClick={() => { setCameraMode('photo'); stopCamera(); setCapturedMedia(null); }}
                  >📸 Photo</button>
                </div>

                {/* Camera Preview */}
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

                {/* Captured Media Preview */}
                {capturedMedia && !cameraActive && (
                  <div style={styles.previewBox}>
                    <p style={styles.label}>✅ Captured — Preview:</p>
                    {capturedMedia.type === 'video' ? (
                      <video src={capturedMedia.url} controls style={styles.videoPreview} />
                    ) : (
                      <img src={capturedMedia.url} alt="Captured" style={styles.videoPreview} />
                    )}
                  </div>
                )}

                {/* Camera Controls */}
                {!cameraActive && !capturedMedia && (
                  <button style={styles.primaryBtn} onClick={startCamera}>
                    {cameraMode === 'video' ? '🎥 Start Camera' : '📷 Open Camera'}
                  </button>
                )}

                {cameraActive && cameraMode === 'video' && !recording && (
                  <button style={{ ...styles.primaryBtn, backgroundColor: '#ef4444' }} onClick={startRecording}>
                    🔴 Start Recording
                  </button>
                )}

                {cameraActive && cameraMode === 'video' && recording && (
                  <button style={{ ...styles.primaryBtn, backgroundColor: '#f59e0b' }} onClick={stopRecording}>
                    ⏹ Stop Recording
                  </button>
                )}

                {cameraActive && cameraMode === 'photo' && (
                  <button style={{ ...styles.primaryBtn, backgroundColor: '#10b981' }} onClick={capturePhoto}>
                    📸 Capture Photo
                  </button>
                )}

                {capturedMedia && (
                  <button style={styles.secondaryBtn} onClick={() => { setCapturedMedia(null); setResult(null); }}>
                    🔄 Retake
                  </button>
                )}

                {/* Declaration + Upload */}
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
                      {loading ? 'Uploading...' : '🚀 Authenticate & Submit'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* UPLOAD FILE TAB */}
            {activeTab === 'upload' && (
              <div>
                <p style={styles.label}>Select Video or Photo</p>
                <input style={styles.fileInput} type="file" accept="video/*,image/*"
                  onChange={e => setSelectedFile(e.target.files[0])} />
                {selectedFile && <p style={styles.fileName}>📁 {selectedFile.name}</p>}
                <div style={styles.declarationBox}>
                  <input type="checkbox" id="declaration2" checked={declaration}
                    onChange={e => setDeclaration(e.target.checked)} />
                  <label htmlFor="declaration2" style={styles.declarationText}>
                    I confirm this media is authentic and I am accountable for this submission.
                  </label>
                </div>
                {error && <p style={styles.error}>{error}</p>}
                <button style={styles.primaryBtn} onClick={handleUpload} disabled={loading}>
                  {loading ? 'Uploading...' : '🚀 Upload & Authenticate'}
                </button>
              </div>
            )}

            {/* Result */}
            {result && (
              <div style={styles.resultBox}>
                <h3 style={styles.resultTitle}>✅ Upload Successful</h3>
                <p style={styles.resultText}>Claim ID: <strong>{result.claimId}</strong></p>
                <p style={styles.resultText}>File Hash: <strong>{result.fileHash?.substring(0, 20)}...</strong></p>
                <p style={styles.resultNote}>💾 Save your Claim ID to verify later!</p>
              </div>
            )}
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
    maxWidth: '540px',
    width: '90%',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
  },
  title: {
    color: '#f1f5f9',
    fontSize: '1.8rem',
    marginBottom: '16px',
  },
  tabRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
  },
  tabActive: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  tabInactive: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#0f172a',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  modeRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  modeActive: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#7c3aed',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  modeInactive: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#0f172a',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  videoPreview: {
    width: '100%',
    borderRadius: '8px',
    marginBottom: '12px',
    backgroundColor: '#000',
  },
  previewBox: {
    marginBottom: '12px',
  },
  label: {
    color: '#94a3b8',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '12px',
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
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '12px',
  },
  secondaryBtn: {
    width: '100%',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '8px',
  },
  backBtn: {
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: 'none',
    cursor: 'pointer',
    marginBottom: '16px',
    fontSize: '0.9rem',
  },
  declarationBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    backgroundColor: '#0f172a',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '12px',
    marginTop: '12px',
  },
  declarationText: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    lineHeight: '1.5',
  },
  error: {
    color: '#ef4444',
    fontSize: '0.9rem',
    marginBottom: '8px',
  },
  success: {
    color: '#10b981',
    marginBottom: '16px',
  },
  resultBox: {
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '16px',
    border: '1px solid #10b981',
  },
  resultTitle: {
    color: '#10b981',
    marginBottom: '8px',
  },
  resultText: {
    color: '#f1f5f9',
    fontSize: '0.9rem',
    marginBottom: '4px',
  },
  resultNote: {
    color: '#f59e0b',
    fontSize: '0.85rem',
    marginTop: '8px',
  },
  registerText: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    marginTop: '12px',
    textAlign: 'center',
  },
  link: {
    color: '#3b82f6',
    cursor: 'pointer',
  },
};

export default Record;