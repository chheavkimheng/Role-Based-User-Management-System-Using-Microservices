require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const connectDB = require('./dbConnect');
const User = require('./models/user_schema');

const app = express();
const PORT = process.env.PORT || 5002;

app.use(express.json());

connectDB();

app.get('/health', (req, res) => {
  res.json({ service: 'login-service', status: 'up' });
});

// POST /login
// Reached via the gateway as POST /auth/login — gateway strips /auth,
// so this service only ever sees /login.
app.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // 1. Validate input
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'email, password, and role are required' });
    }
    if (role !== 'admin' && role !== 'user') {
      return res.status(400).json({ message: 'role must be either "admin" or "user"' });
    }

    // 2. Look up user
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Same generic message whether the email doesn't exist, the password
    // is wrong, or the role doesn't match — don't leak which one failed.
    const invalidMsg = { message: 'Invalid email, password, or role' };

    if (!user) {
      return res.status(401).json(invalidMsg);
    }

    // 3. Check password against stored hash
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json(invalidMsg);
    }

    // 4. Check role matches what's stored for this user
    if (user.role !== role) {
      return res.status(401).json(invalidMsg);
    }

    // 5. Sign JWT with role claim — this is what the gateway checks in Task 7
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    // 6. Return token
    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ message: 'Server error during login' });
  }
});

app.listen(PORT, () => {
  console.log(`Login Service running on port ${PORT}`);
});