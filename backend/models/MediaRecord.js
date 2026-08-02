const mongoose = require('mongoose');

const mediaRecordSchema = new mongoose.Schema({
  claimId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: String,
  mediaType: {
    type: String,
    enum: ['video', 'image']
  },
  hashChain: [String],
  finalHash: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  gpsLocation: {
    latitude: Number,
    longitude: Number
  },
  deviceId: String,
  sessionId: String,
  watermarkData: String,
  verdict: {
    type: String,
    enum: ['authentic', 'tampered', 'pending'],
    default: 'pending'
  }
});

module.exports = mongoose.model('MediaRecord', mediaRecordSchema);