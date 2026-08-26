const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');
const MediaRecord = require('../models/MediaRecord');

// POST /api/notifications/log-download - Record download access event
router.post('/log-download', async (req, res) => {
  try {
    const { claimId, fileName } = req.body;
    if (!claimId && !fileName) {
      return res.status(400).json({ message: 'Claim ID or fileName required' });
    }

    const query = claimId ? { claimId } : { fileName };
    const record = await MediaRecord.findOne(query);
    if (!record) {
      return res.status(404).json({ message: 'Media record not found' });
    }

    let downloaderId = null;
    let downloaderName = 'Anonymous User';

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        downloaderId = decoded.userId;
        downloaderName = decoded.name || 'Registered User';
      } catch {}
    }

    const notification = new Notification({
      recipient: record.userId,
      claimId: record.claimId,
      mediaType: record.mediaType || 'video',
      fileName: fileName || record.fileName,
      eventType: 'DOWNLOAD',
      verifierName: downloaderName,
      verifierId: downloaderId,
      verdict: 'MEDIA DOWNLOADED',
      tamperPercentage: 0,
      tamperedCount: 0,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown Client'
    });

    await notification.save();
    console.log(`Download Notification logged for uploader ${record.userId} on Claim ${record.claimId}`);

    res.json({ message: 'Download event recorded', notification });
  } catch (err) {
    console.error('Error recording download notification:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// JWT verification middleware
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

// GET /api/notifications - List all notifications for authenticated user
router.get('/', verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.userId,
      isRead: false
    });

    res.json({
      notifications,
      unreadCount
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Failed to fetch notifications', error: err.message });
  }
});

// PATCH /api/notifications/read-all - Mark all notifications as read
router.patch('/read-all', verifyToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.userId, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all notifications read:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/notifications/:id/read - Mark single notification as read
router.patch('/:id/read', verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.userId },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/notifications/clear-all - Delete all notifications
router.delete('/clear-all', verifyToken, async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user.userId });
    res.json({ message: 'All notifications cleared' });
  } catch (err) {
    console.error('Error clearing notifications:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/notifications/:id - Delete single notification
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
