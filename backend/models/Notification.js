const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  claimId: {
    type: String,
    required: true
  },
  mediaType: {
    type: String,
    enum: ['video', 'image'],
    default: 'video'
  },
  eventType: {
    type: String,
    enum: ['VERIFICATION', 'DOWNLOAD'],
    default: 'VERIFICATION'
  },
  fileName: String,
  verifierName: {
    type: String,
    default: 'Anonymous User'
  },
  verifierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verdict: {
    type: String,
    enum: ['AUTHENTIC MEDIA', 'MEDIA TAMPERED', 'MEDIA DOWNLOADED'],
    default: 'AUTHENTIC MEDIA'
  },
  tamperPercentage: {
    type: Number,
    default: 0
  },
  tamperedCount: {
    type: Number,
    default: 0
  },
  ipAddress: String,
  userAgent: String,
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
