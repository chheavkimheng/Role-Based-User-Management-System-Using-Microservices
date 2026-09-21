require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const requireRole = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Still no express.json() here — the gateway only reads the Authorization
// header, never the body, and parsing it here would break the proxy
// pass-through (confirmed back in Task 4).

app.get('/health', (req, res) => {
  res.json({ service: 'api-gateway', status: 'up' });
});

// Route: Registration Service — public, no token required
app.use(
  '/register',
  createProxyMiddleware({
    target: process.env.REGISTRATION_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/register': '' },
  })
);

app.use(
  '/auth',
  createProxyMiddleware({
    target: process.env.LOGIN_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/auth': '' },
  })
);

app.use(
  '/admin',
  requireRole('admin'),
  createProxyMiddleware({
    target: process.env.ADMIN_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/admin': '' },
  })
);

app.use(
  '/user',
  requireRole('user'),
  (req, res, next) => {
    req.headers['x-user-email'] = req.user.email;
    next();
  },
  createProxyMiddleware({
    target: process.env.USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/user': '' },
    on: {
      proxyReq: (proxyReq, req) => {
        if (req.user) {
          proxyReq.setHeader('x-user-email', req.user.email);
        }
      },
    },
  })
);

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});