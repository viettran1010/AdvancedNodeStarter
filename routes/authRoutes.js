const crypto = require('crypto');
const passport = require('passport'); // Assuming passport is required for authentication
const { Op } = require('sequelize'); // Import Sequelize operator

// Assuming models are exported from a central file
const { User, PasswordResetLink, Request, Photo } = require('../models');

// Assuming the emailService and mailingService are two different services that need to be combined
const { sendVerificationEmail } = require('../services/emailService');
const { sendPasswordResetEmail } = require('../services/mailingService');

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

  // Existing password reset request route
  app.post('/auth/forgot_password', async (req, res) => {
    // ... existing code ...
  });

  // Existing route for password reset confirmation
  app.post('/auth/reset_password', async (req, res) => {
    // ... existing code ...
  });

  // Existing route handler for user registration
  app.post('/api/register', async (req, res) => {
    // ... existing code ...
  });

  // Existing route handler for email verification
  app.get('/api/verify_email/:token', async (req, res) => {
    // ... existing code ...
  });

  // New route for creating a password reset link
  app.post('/api/users/password_reset_link', async (req, res) => {
    try {
      const { email } = req.body;

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(422).send({ error: 'Invalid email format.' });
      }

      // Find user by email
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(404).send({ error: 'Email not registered in the system.' });
      }

      // Generate token and expiration date
      const token = crypto.randomBytes(20).toString('hex');
      const expirationDate = new Date(Date.now() + 3600000); // 1 hour from now

      // Create password reset link
      const passwordResetLink = PasswordResetLink.build({
        token,
        user_id: user.id,
        expires_at: expirationDate,
        used: false
      });
      await passwordResetLink.save();

      // Send password reset email
      await sendPasswordResetEmail(email, token);

      // Return success message
      res.status(200).send({ message: 'Password reset link has been sent to your email.' });
    } catch (error) {
      console.error(error);
      res.status(500).send({ error: 'An unexpected error occurred on the server.' });
    }
  });

  // Password validation function
  function validatePassword(password) {
    // ... existing code ...
  }
};
