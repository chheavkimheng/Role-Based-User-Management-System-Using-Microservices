require('dotenv').config();
const express = require('express');
const connectDB = require('./dbConnect');
const User = require('./models/user_schema');

const app = express();
const PORT = process.env.PORT || 5004;

app.use(express.json());

connectDB();

app.get('/health', (req, res) => {
  res.json({ service: 'admin-service', status: 'up' });
});

// GET /searchuser?query=<name-or-email>
// Reached via the gateway as GET /admin/searchuser
app.get('/searchuser', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'query parameter is required (name or email)' });
    }

    // Case-insensitive partial match on name OR exact-ish match on email
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    }).select('-password');

    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found matching that search' });
    }

    return res.status(200).json({ count: users.length, users });
  } catch (error) {
    console.error('Search user error:', error.message);
    return res.status(500).json({ message: 'Server error during search' });
  }
});

// GET /viewalluser
// Reached via the gateway as GET /admin/viewalluser
app.get('/viewalluser', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    return res.status(200).json({ count: users.length, users });
  } catch (error) {
    console.error('View all users error:', error.message);
    return res.status(500).json({ message: 'Server error fetching users' });
  }
});

// DELETE /deluser?email=<email>
// Reached via the gateway as DELETE /admin/deluser
app.delete('/deluser', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: 'email query parameter is required' });
    }

    const deletedUser = await User.findOneAndDelete({ email: email.toLowerCase().trim() });

    if (!deletedUser) {
      return res.status(404).json({ message: 'No user found with that email' });
    }

    return res.status(200).json({ message: 'User deleted successfully', email: deletedUser.email });
  } catch (error) {
    console.error('Delete user error:', error.message);
    return res.status(500).json({ message: 'Server error during deletion' });
  }
});

app.listen(PORT, () => {
  console.log(`Admin Service running on port ${PORT}`);
});