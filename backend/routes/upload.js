const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { generateHash, chainHashes } = require('../utils/hashChain');
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

// Middleware to verify token
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

// Upload media route
router.post('/', verifyToken, upload.single('media'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const { latitude, longitude, deviceId, sessionId, mediaType } = req.body;

    // Generate Claim ID
    const claimId = 'MT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

    // Generate hash of file
    const fs = require('fs');
    const fileBuffer = fs.readFileSync(file.path);
    const fileHash = generateHash(fileBuffer.toString('base64'));

    // Watermark data
    const watermarkData = JSON.stringify({
      claimId,
      userId: req.user.userId,
      timestamp: new Date().toISOString(),
      latitude,
      longitude,
      deviceId,
      sessionId
    });

    // Save to database
    const mediaRecord = new MediaRecord({
      claimId,
      userId: req.user.userId,
      fileName: file.filename,
      mediaType: mediaType || 'video',
      hashChain: [fileHash],
      finalHash: fileHash,
      gpsLocation: { latitude, longitude },
      deviceId,
      sessionId,
      watermarkData,
      verdict: 'authentic'
    });

    await mediaRecord.save();

    res.status(201).json({
      message: 'Media uploaded successfully',
      claimId,
      fileHash
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;