require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const connectDB = require('./dbConnect');
const User = require('./models/user_schema');

const app = express();
const PORT = process.env.PORT || 5001;
const SALT_ROUNDS = 10;

app.use(express.json());

connectDB();

app.get('/health', (req, res) => {
  res.json({ service: 'registration-service', status: 'up' });
});

// POST /userregister
// Reached via the gateway as POST /register/userregister — gateway strips
// the /register prefix before forwarding (confirmed in Task 4), so this
// service only ever sees /userregister.
app.post('/userregister', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // 1. Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, and password are required' });
    }

    // 2. Check email uniqueness
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    // 3. Hash password — never store plaintext
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 4. Store in MongoDB
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role === 'admin' ? 'admin' : 'user',
      phone,
    });
    await newUser.save();

    // 5. Return success — echo back safe fields only, never the password
    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    return res.status(500).json({ message: 'Server error during registration' });
  }
});

app.listen(PORT, () => {
  console.log(`Registration Service running on port ${PORT}`);
});