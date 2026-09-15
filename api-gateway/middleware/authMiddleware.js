const jwt = require('jsonwebtoken');

// requireRole('admin') or requireRole('user') — returns Express middleware
// that rejects the request unless a valid, non-expired JWT is present AND
// its role claim matches the one required for this route.
function requireRole(requiredRole) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Case 1: No token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Case 2: Valid token, wrong role for this route
      if (decoded.role !== requiredRole) {
        return res.status(403).json({ message: `Access denied: ${requiredRole} role required` });
      }

      // Attach decoded user info in case downstream services want it later
      req.user = decoded;
      next();
    } catch (error) {
      // Case 3: Expired token
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token has expired' });
      }
      // Case 4: Invalid token (bad signature, malformed, tampered)
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}

module.exports = requireRole;