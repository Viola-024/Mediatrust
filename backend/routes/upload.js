const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { generateHash } = require('../utils/hashChain');
const MediaRecord = require('../models/MediaRecord');
const jwt = require('jsonwebtoken');

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// JWT middleware
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Upload route
router.post('/', verifyToken, upload.single('media'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const { latitude, longitude, deviceId, sessionId, mediaType } = req.body;
    const isVideo = mediaType === 'video' || file.mimetype.includes('video');

    // Generate Claim ID
    const claimId = 'MT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

    let frameHashes = [];
    let finalHash = '';
    let totalFrames = 0;

    // Call Python service for frame-level hashing
    try {
      const formData = new FormData();
      formData.append('media', fs.createReadStream(file.path), file.filename);

      if (isVideo) {
        // Video — extract and hash every frame
        const response = await axios.post(
          'http://127.0.0.1:5001/hash-frames',
          formData,
          { headers: formData.getHeaders(), timeout: 60000 }
        );

        frameHashes = response.data.frame_hashes;
        finalHash = response.data.final_hash;
        totalFrames = response.data.total_frames;

        console.log(`Video hashed: ${totalFrames} frames processed`);

      } else {
        // Image — hash whole image + blocks
        const response = await axios.post(
          'http://127.0.0.1:5001/hash-image',
          formData,
          { headers: formData.getHeaders(), timeout: 30000 }
        );

        frameHashes = response.data.block_hashes;
        finalHash = response.data.overall_hash;
        totalFrames = response.data.total_blocks;

        console.log(`Image hashed: ${totalFrames} blocks processed`);
      }

    } catch (pythonError) {
      // Fallback to single file hash if Python fails
      console.error('Python service error — falling back to file hash:', pythonError.message);
      const fileBuffer = fs.readFileSync(file.path);
      finalHash = generateHash(fileBuffer.toString('base64'));
      frameHashes = [{ frame_index: 0, hash: finalHash }];
      totalFrames = 1;
    }

    // Watermark metadata
    const watermarkData = JSON.stringify({
      claimId,
      userId: req.user.userId,
      timestamp: new Date().toISOString(),
      latitude,
      longitude,
      deviceId,
      sessionId
    });

    // Save to MongoDB
    const mediaRecord = new MediaRecord({
      claimId,
      userId: req.user.userId,
      fileName: file.filename,
      mediaType: isVideo ? 'video' : 'image',
      hashChain: frameHashes.map(f => f.hash),
      frameHashes: frameHashes,
      totalFrames: totalFrames,
      finalHash: finalHash,
      gpsLocation: { latitude, longitude },
      deviceId,
      sessionId,
      watermarkData,
      verdict: 'authentic'
    });

    await mediaRecord.save();

    res.status(201).json({
      message: 'Media uploaded and authenticated successfully',
      claimId,
      finalHash,
      totalFrames,
      mediaType: isVideo ? 'video' : 'image',
      fileName: file.filename
    });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/upload/my-media - Fetch all authenticated media for the logged in user
router.get('/my-media', verifyToken, async (req, res) => {
  try {
    const records = await MediaRecord.find({ userId: req.user.userId })
      .sort({ timestamp: -1 });

    const formattedRecords = records.map(r => ({
      _id: r._id,
      claimId: r.claimId,
      fileName: r.fileName,
      mediaType: r.mediaType || 'video',
      timestamp: r.timestamp,
      date: new Date(r.timestamp).toLocaleString(),
      gpsLocation: r.gpsLocation,
      verdict: r.verdict || 'authentic',
      totalFrames: r.totalFrames || 0,
      finalHash: r.finalHash,
      url: `http://localhost:5000/uploads/${r.fileName}`,
      serverFileName: r.fileName,
      filename: r.mediaType === 'video'
        ? `MediaTrust_Video_${r.claimId}.webm`
        : `MediaTrust_Photo_${r.claimId}.png`
    }));

    res.json({ success: true, count: formattedRecords.length, media: formattedRecords });
  } catch (err) {
    console.error('Error fetching user media:', err);
    res.status(500).json({ message: 'Failed to retrieve media library', error: err.message });
  }
});

// DELETE /api/upload/:claimId - Delete a media record
router.delete('/:claimId', verifyToken, async (req, res) => {
  try {
    const { claimId } = req.params;
    const record = await MediaRecord.findOne({ claimId, userId: req.user.userId });
    if (!record) {
      return res.status(404).json({ message: 'Media record not found or unauthorized' });
    }

    // Try to remove physical file if it exists
    const filePath = path.join(__dirname, '..', 'uploads', record.fileName);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (fsErr) {
        console.warn('Could not delete physical file:', fsErr.message);
      }
    }

    await MediaRecord.deleteOne({ _id: record._id });

    res.json({ success: true, message: 'Media record deleted successfully', claimId });
  } catch (err) {
    console.error('Error deleting media record:', err);
    res.status(500).json({ message: 'Failed to delete media', error: err.message });
  }
});

module.exports = router;