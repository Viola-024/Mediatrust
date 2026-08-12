const mongoose = require('mongoose');

const frameHashSchema = new mongoose.Schema({
  frame_index: Number,
  hash: String,
  row: Number,
  col: Number,
  width: Number,
  height: Number
}, { _id: false });

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
  frameHashes: [frameHashSchema],
  totalFrames: Number,
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