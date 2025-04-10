// code-editor-backend/models/Session.js
const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true,
    default: 'python'
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
});

// Update lastModified timestamp before saving
SessionSchema.pre('save', function(next) {
  this.lastModified = Date.now();
  next();
});

module.exports = mongoose.model('Session', SessionSchema);