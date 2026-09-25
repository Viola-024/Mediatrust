const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { generateHash } = require('../utils/hashChain');
const MediaRecord = require('../models/MediaRecord');
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');

const upload = multer({ dest: 'temp/' });

router.post('/', upload.single('media'), async (req, res) => {
  try {
    const file = req.file;
    const { claimId } = req.body;

    if (!file) return res.status(400).json({ message: 'No file provided' });
    if (!claimId) return res.status(400).json({ message: 'Claim ID required' });

    // Find original record
    const record = await MediaRecord.findOne({ claimId });
    if (!record) return res.status(404).json({ message: 'Claim ID not found' });

    const isVideo = record.mediaType === 'video';

    // Path to originally stored file
    const originalFilePath = path.join(__dirname, '..', 'uploads', record.fileName);
    const originalExists = fs.existsSync(originalFilePath);

    let verificationResult = null;

    try {
      const formData = new FormData();

      if (isVideo) {
        formData.append('media', fs.createReadStream(file.path), file.originalname || 'video.webm');
        formData.append('storedHashes', JSON.stringify(record.frameHashes || []));

        if (originalExists) {
          formData.append('original_media', fs.createReadStream(originalFilePath), record.fileName);
        }

        const response = await axios.post(
          'http://127.0.0.1:5001/verify-frames',
          formData,
          { headers: formData.getHeaders(), timeout: 120000 }
        );

        verificationResult = response.data;
        console.log(`Video verified: ${verificationResult.tampered_count} frames tampered out of ${verificationResult.total_frames}`);
      } else {
        // For images — send submitted file and stored hashes, plus original file if available
        formData.append('media', fs.createReadStream(file.path), file.originalname || 'image.png');
        formData.append('storedBlockHashes', JSON.stringify(record.frameHashes || []));
        formData.append('storedOverallHash', record.finalHash || '');

        if (originalExists) {
          formData.append('original_media', fs.createReadStream(originalFilePath), record.fileName);
        }

        const response = await axios.post(
          'http://127.0.0.1:5001/verify-image',
          formData,
          { headers: formData.getHeaders(), timeout: 30000 }
        );

        verificationResult = response.data;

        // Exact binary file match fast-path
        if (originalExists) {
          const uploadedBuffer = fs.readFileSync(file.path);
          const originalBuffer = fs.readFileSync(originalFilePath);
          const uploadedHash = generateHash(uploadedBuffer.toString('base64'));
          const originalHash = generateHash(originalBuffer.toString('base64'));

          if (uploadedHash === originalHash) {
            verificationResult.verdict = 'AUTHENTIC';
            verificationResult.tampered_count = 0;
            verificationResult.tamper_percentage = 0;
            console.log('Exact file hash match — file is authentic');
          }
        }

        console.log(`Image verified: ${verificationResult.tampered_count} blocks tampered (Verdict: ${verificationResult.verdict})`);
      }

    } catch (pythonError) {
      console.error('Python verification error — falling back:', pythonError.message);

      // Fallback — direct file comparison
      if (originalExists) {
        const uploadedBuffer = fs.readFileSync(file.path);
        const originalBuffer = fs.readFileSync(originalFilePath);
        const uploadedHash = generateHash(uploadedBuffer.toString('base64'));
        const originalHash = generateHash(originalBuffer.toString('base64'));
        const hashMatch = uploadedHash === originalHash;

        verificationResult = {
          verdict: hashMatch ? 'AUTHENTIC' : 'TAMPERED',
          tampered_count: hashMatch ? 0 : 1,
          intact_count: hashMatch ? 1 : 0,
          total_frames: 1,
          tampered_frames: [],
          tampered_blocks: [],
          tamper_percentage: hashMatch ? 0 : 100
        };
      } else {
        const fileBuffer = fs.readFileSync(file.path);
        const newHash = generateHash(fileBuffer.toString('base64'));
        const hashMatch = newHash === record.finalHash;

        verificationResult = {
          verdict: hashMatch ? 'AUTHENTIC' : 'TAMPERED',
          tampered_count: hashMatch ? 0 : 1,
          intact_count: hashMatch ? 1 : 0,
          total_frames: 1,
          tampered_frames: [],
          tampered_blocks: [],
          tamper_percentage: hashMatch ? 0 : 100
        };
      }
    }

    // Clean up temp file
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    const isAuthentic = verificationResult.verdict === 'AUTHENTIC';

    const report = {
      claimId: record.claimId,
      mediaType: record.mediaType,
      hashChainIntegrity: isAuthentic ? 'VALID' : 'BROKEN',
      watermarkStatus: record.watermarkData ? 'PRESENT' : 'MISSING',
      metadataMatch: isAuthentic ? 'VERIFIED' : 'MISMATCH',
      originalUploader: record.userId,
      userId: record.userId,
      originalFinalHash: record.finalHash || 'NOT_RECORDED',
      computedFinalHash: isAuthentic ? (record.finalHash || 'NOT_RECORDED') : 'TAMPERED_HASH_MISMATCH',
      location: record.gpsLocation,
      timestamp: record.timestamp,
      verdict: isAuthentic ? 'AUTHENTIC MEDIA' : 'MEDIA TAMPERED',
      totalFrames: verificationResult.total_frames,
      originalTotalFrames: verificationResult.original_total_frames || record.totalFrames,
      submittedTotalFrames: verificationResult.submitted_total_frames || verificationResult.total_frames,
      tamperedCount: verificationResult.tampered_count,
      intactCount: verificationResult.intact_count,
      tamperPercentage: verificationResult.tamper_percentage,
      firstTamperedFrame: verificationResult.first_tampered_frame || null,
      tamperedFrames: verificationResult.tampered_frames || [],
      tamperedBlocks: verificationResult.tampered_blocks || [],
      editDiagnostics: verificationResult.edit_diagnostics || [],
      visualComparisons: verificationResult.visual_comparisons || []
    };

    // Extract optional verifier identity from JWT header if provided
    let verifierId = null;
    let verifierName = 'Anonymous Auditor';

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        verifierId = decoded.userId;
        verifierName = decoded.name || 'Authenticated Auditor';
      } catch {
        // Fallback to anonymous
      }
    }

    // Save Access Notification for the original media uploader
    if (record.userId) {
      try {
        const notification = new Notification({
          recipient: record.userId,
          claimId: record.claimId,
          mediaType: record.mediaType || 'video',
          fileName: record.fileName,
          verifierName: verifierName,
          verifierId: verifierId,
          verdict: report.verdict,
          tamperPercentage: report.tamperPercentage || 0,
          tamperedCount: report.tamperedCount || 0,
          ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
          userAgent: req.headers['user-agent'] || 'Unknown Client'
        });
        await notification.save();
        console.log(`Access Notification saved for uploader ${record.userId} on Claim ${record.claimId}`);
      } catch (notifErr) {
        console.error('Failed to create access notification:', notifErr.message);
      }
    }

    res.json(report);

  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;