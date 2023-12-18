const bcrypt = require('bcrypt');
const { Op } = require('sequelize'); // Import Sequelize operator
const passport = require('passport'); // Assuming passport is required for authentication

// Assuming models are exported from a central file
const { PasswordResetLink, User } = require('../models');

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

  // New route for password reset
  app.post('/auth/reset_password', async (req, res) => {
    try {
      const { token, password } = req.body;
      // Validate the token
      const passwordResetLink = await PasswordResetLink.findOne({
        where: {
          token: token,
          used: false,
          expires_at: {
            [Op.gt]: new Date() // Op.gt is Sequelize operator for greater than
          }
        }
      });

      if (!passwordResetLink) {
        return res.status(400).send({ error: 'Invalid or expired password reset token.' });
      }

      // Validate the new password
      if (!validatePassword(password)) {
        return res.status(400).send({ error: 'Password does not meet the policy requirements.' });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update the user's password
      await User.update({ password: hashedPassword }, {
        where: {
          id: passwordResetLink.user_id
        }
      });

      // Mark the token as used
      await passwordResetLink.update({ used: true });

      res.send({ message: 'Password has been reset successfully.' });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).send({ error: 'An error occurred while resetting the password.' });
    }
  });

  // New route handler for email verification
  app.post('/api/verify_account', async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).send({ error: 'Token is required' });
      }

      const passwordResetLink = await PasswordResetLink.findOne({ token });
      if (!passwordResetLink) {
        return res.status(404).send({ error: 'Token not found' });
      }

      if (passwordResetLink.used) {
        return res.status(400).send({ error: 'Token has already been used' });
      }

      if (passwordResetLink.expires_at < new Date()) {
        return res.status(400).send({ error: 'Token has expired' });
      }

      const user = await User.findById(passwordResetLink.user_id);
      if (!user) {
        return res.status(404).send({ error: 'User not found' });
      }

      user.account_verified = true;
      await user.save();

      passwordResetLink.used = true;
      await passwordResetLink.save();

      res.send({ message: 'Account has been verified successfully' });
    } catch (error) {
      console.error('Error verifying account:', error);
      res.status(500).send({ error: 'Internal server error' });
    }
  });

  // Password validation function
  function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasNonalphas = /\W/.test(password);
    return (
      typeof password === 'string' &&
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasNonalphas
    );
  }
};
