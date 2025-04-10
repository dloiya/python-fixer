// code-editor-backend/services/sessionService.js
const Session = require('../models/Session');
const { normalizeIP } = require('../utils/ipUtil');

async function saveSession(ipAddress, code, language = 'python') {
  try {
    // Normalize IP address
    ipAddress = normalizeIP(ipAddress);
    
    // Find existing session by IP or create a new one
    let session = await Session.findOne({ ipAddress });
    
    if (session) {
      session.code = code;
      session.language = language;
      session.lastModified = Date.now();
    } else {
      session = new Session({
        ipAddress,
        code,
        language
      });
    }
    
    await session.save();
    return session;
  } catch (error) {
    console.error('Error saving session:', error);
    throw new Error('Failed to save session');
  }
}

async function getSession(ipAddress) {
  try {
    // Normalize IP address
    ipAddress = normalizeIP(ipAddress);
    
    const session = await Session.findOne({ ipAddress });
    return session;
  } catch (error) {
    console.error('Error retrieving session:', error);
    throw new Error('Failed to retrieve session');
  }
}

// Get all sessions (admin function)
async function getAllSessions() {
  try {
    const sessions = await Session.find({}).sort({ lastModified: -1 });
    return sessions;
  } catch (error) {
    console.error('Error retrieving all sessions:', error);
    throw new Error('Failed to retrieve sessions');
  }
}

module.exports = {
  saveSession,
  getSession,
  getAllSessions
};