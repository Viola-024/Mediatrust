const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { generateHash } = require('../utils/hashChain');
const MediaRecord = require('../models/MediaRecord');

const upload = multer({ dest: 'temp/' });

router.post('/', upload.single('media'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file provided' });

    const { claimId } = req.body;
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
        console.log('frameHashes length:', record.frameHashes?.length);
        console.log('frameHashes type:', typeof record.frameHashes);
        console.log('sample:', JSON.stringify(record.frameHashes?.[0]));

        const hashesString = JSON.stringify(record.frameHashes || []);
        console.log('hashesString length:', hashesString.length);

        formData.append('media', fs.createReadStream(file.path), file.originalname || 'video.webm');
        formData.append('storedHashes', hashesString);

        if (originalExists) {
          formData.append('original_media', fs.createReadStream(originalFilePath), record.fileName);
        }

        const response = await axios.post(
          'http://127.0.0.1:5001/verify-frames',
          formData,
          { headers: formData.getHeaders(), timeout: 60000 }
        );

        verificationResult = response.data;
        console.log(`Video verified: ${verificationResult.tampered_count} frames tampered out of ${verificationResult.total_frames}`);
      } else {
        // For images — use the ORIGINAL stored file for re-hashing
        // and compare with stored block hashes
        const imageToVerify = originalExists ? originalFilePath : file.path;

        formData.append(
          'media',
          fs.createReadStream(imageToVerify),
          record.fileName
        );
        formData.append('storedBlockHashes', JSON.stringify(record.frameHashes));
        formData.append('storedOverallHash', record.finalHash);

        const response = await axios.post(
          'http://127.0.0.1:5001/verify-image',
          formData,
          { headers: formData.getHeaders(), timeout: 30000 }
        );

        verificationResult = response.data;

        // Now also check uploaded file against original
        // to detect if user uploaded a different/tampered file
        if (originalExists) {
          const uploadedBuffer = fs.readFileSync(file.path);
          const originalBuffer = fs.readFileSync(originalFilePath);
          const uploadedHash = generateHash(uploadedBuffer.toString('base64'));
          const originalHash = generateHash(originalBuffer.toString('base64'));

          if (uploadedHash !== originalHash) {
            // File was modified after original upload
            verificationResult.verdict = 'TAMPERED';
            verificationResult.tampered_count = verificationResult.tampered_count || 1;
            verificationResult.tamper_percentage = verificationResult.tamper_percentage || 100;
            console.log('File hash mismatch — file was modified after upload');
          } else {
            verificationResult.verdict = 'AUTHENTIC';
            verificationResult.tampered_count = 0;
            verificationResult.tamper_percentage = 0;
            console.log('File hash match — file is authentic');
          }
        }

        console.log(`Image verified: ${verificationResult.tampered_count} blocks tampered`);
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
    fs.unlinkSync(file.path);

    const isAuthentic = verificationResult.verdict === 'AUTHENTIC';

    const report = {
      claimId: record.claimId,
      mediaType: record.mediaType,
      hashChainIntegrity: isAuthentic ? 'VALID' : 'BROKEN',
      watermarkStatus: record.watermarkData ? 'PRESENT' : 'MISSING',
      metadataMatch: isAuthentic ? 'VERIFIED' : 'MISMATCH',
      originalUploader: record.userId,
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

    res.json(report);

  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;