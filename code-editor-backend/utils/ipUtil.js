// code-editor-backend/utils/ipUtil.js
/**
 * Normalize IP address for storage by removing port information and handling IPv6
 * @param {string} ip - Original IP address
 * @returns {string} - Normalized IP address
 */
function normalizeIP(ip) {
    // Handle IPv6 localhost
    if (ip === '::1') {
      return '127.0.0.1';
    }
    
    // Handle IPv4-mapped IPv6 addresses
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }
    
    // Remove port if present
    if (ip.includes(':')) {
      ip = ip.split(':')[0];
    }
    
    return ip;
  }
  
  /**
   * Get client IP from request
   * @param {Object} req - Express request object
   * @returns {string} - Client IP address
   */
  function getClientIP(req) {
    // Try to get IP from express-ip middleware
    if (req.ipInfo && req.ipInfo.ip) {
      return normalizeIP(req.ipInfo.ip);
    }
    
    // Fallbacks
    const ip = req.headers['x-forwarded-for'] || 
               req.socket.remoteAddress || 
               req.ip;
               
    return normalizeIP(ip);
  }
  
  module.exports = {
    normalizeIP,
    getClientIP
  };