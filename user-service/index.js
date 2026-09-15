require('dotenv').config();
const express = require('express');
const connectDB = require('./dbConnect');
const User = require('./models/user_schema');

const app = express();
const PORT = process.env.PORT || 5005;

app.use(express.json());

connectDB();

app.get('/health', (req, res) => {
  res.json({ service: 'user-service', status: 'up' });
});

// GET /viewprofile
// Reached via the gateway as GET /user/viewprofile
// Identity comes from the x-user-email header the gateway injected.
app.get('/viewprofile', async (req, res) => {
  try {
    const email = req.headers['x-user-email'];
    if (!email) {
      return res.status(401).json({ message: 'Missing user identity' });
    }

    const user = await User.findOne({ email }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('View profile error:', error.message);
    return res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// PUT /updateprofile
// Reached via the gateway as PUT /user/updateprofile
// Only name and phone are editable here — email/password/role stay out of
// scope for this route (email is the account identifier, role is admin-only
// territory, and password change wasn't part of what the brief asked for).
app.put('/updateprofile', async (req, res) => {
  try {
    const email = req.headers['x-user-email'];
    if (!email) {
      return res.status(401).json({ message: 'Missing user identity' });
    }

    const { name, phone } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Provide at least one field to update: name or phone' });
    }

    const updatedUser = await User.findOneAndUpdate(
      { email },
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error.message);
    return res.status(500).json({ message: 'Server error updating profile' });
  }
});

app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});