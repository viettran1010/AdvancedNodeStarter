const passport = require('passport');
const bcrypt = require('bcryptjs'); // Assuming bcryptjs is a common module for hashing
const { User } = require('../models/User'); // Assuming User model exists and is exported from /models/User
const { clearHash } = require('../services/cacheService'); // Assuming cacheService exists and provides clearHash function

module.exports = app => {
  app.get(
    '/auth/google',
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })
  );

  app.get(
    '/auth/google/callback',
    passport.authenticate('google'),
    (req, res) => {
      res.redirect('/blogs');
    }
  );

  app.get('/auth/logout', (req, res) => {
    req.logout();
    res.redirect('/');
  });

  app.get('/api/current_user', (req, res) => {
    res.send(req.user);
  });

  // New route handler for updating user profile
  app.put('/api/update_user/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, password, password_confirmation } = req.body;

      // Validate user ID
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).send({ error: 'User not found' });
      }

      // Validate email format and uniqueness
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).send({ error: 'Invalid email format' });
      }
      const existingUser = await User.findOne({ email: email, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).send({ error: 'Email is already registered' });
      }

      // Validate password confirmation
      if (password && password !== password_confirmation) {
        return res.status(400).send({ error: 'Passwords do not match' });
      }

      // Hash password if provided
      let hashedPassword;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 12);
      }

      // Update user record
      const updatedUser = await User.findByIdAndUpdate(id, {
        name: name || user.name,
        email: email || user.email,
        ...(hashedPassword && { password: hashedPassword })
      }, { new: true });

      // If email was changed, handle confirmation token and email verification flag
      if (email && email !== user.email) {
        // Generate new confirmation token and send confirmation email logic here
        // Set email verification flag to false
        // Example: updatedUser.emailVerified = false;
        // Note: The actual implementation details for generating a confirmation token and sending an email are not provided here.
      }

      // Clear related cache entries
      clearHash(id);

      res.send({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      res.status(500).send({ error: 'An error occurred while updating the profile' });
    }
  });
};
