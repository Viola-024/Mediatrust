const crypto = require('crypto');

// Generate SHA-256 hash of data
const generateHash = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Chain hashes together
const chainHashes = (frames) => {
  let hashChain = [];
  let previousHash = '';

  frames.forEach((frame, index) => {
    const combined = frame + previousHash;
    const hash = generateHash(combined);
    hashChain.push(hash);
    previousHash = hash;
  });

  return hashChain;
};

// Verify hash chain integrity
const verifyHashChain = (frames, storedChain) => {
  const newChain = chainHashes(frames);

  if (newChain.length !== storedChain.length) {
    return { valid: false, reason: 'Frame count mismatch' };
  }

  for (let i = 0; i < newChain.length; i++) {
    if (newChain[i] !== storedChain[i]) {
      return { valid: false, reason: `Hash mismatch at frame ${i + 1}` };
    }
  }

  return { valid: true, reason: 'Hash chain intact' };
};

module.exports = { generateHash, chainHashes, verifyHashChain };