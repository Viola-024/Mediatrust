const express = require('express');
const router = express.Router();
const multer = require('multer');
const { generateHash, verifyHashChain } = require('../utils/hashChain');
const MediaRecord = require('../models/MediaRecord');

const upload = multer({ dest: 'temp/' });

// Verify media route
router.post('/', upload.single('media'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file provided' });

    const { claimId } = req.body;
    if (!claimId) return res.status(400).json({ message: 'Claim ID required' });

    // Find original record
    const record = await MediaRecord.findOne({ claimId });
    if (!record) return res.status(404).json({ message: 'Claim ID not found' });

    // Recompute hash
    const fs = require('fs');
    const fileBuffer = fs.readFileSync(file.path);
    const newHash = generateHash(fileBuffer.toString('base64'));

    // Compare hashes
    const hashMatch = newHash === record.finalHash;

    // Clean up temp file
    fs.unlinkSync(file.path);

    // Build report
    const report = {
      claimId: record.claimId,
      hashChainIntegrity: hashMatch ? 'VALID' : 'BROKEN',
      watermarkStatus: record.watermarkData ? 'PRESENT' : 'MISSING',
      metadataMatch: hashMatch ? 'VERIFIED' : 'MISMATCH',
      originalUploader: record.userId,
      location: record.gpsLocation,
      timestamp: record.timestamp,
      verdict: hashMatch ? 'AUTHENTIC MEDIA' : 'MEDIA TAMPERED'
    };

    res.json(report);

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;