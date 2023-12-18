const bcrypt = require('bcrypt');
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

  // New password reset request route
  app.post('/auth/forgot_password', async (req, res) => {
    const { email } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).send('User not found.');
      }

      const token = crypto.randomBytes(20).toString('hex'); // Secure token generation
      const expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      const passwordResetLink = new PasswordResetLink({
        token,
        user_id: user.id,
        expires_at: expirationDate
      });
      await passwordResetLink.save();

      await sendPasswordResetEmail(user.email, token);

      res.send('Password reset link has been sent.');
    } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred while processing your request.');
    }
  });

  // New route for password reset confirmation
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

  // New route handler for user registration
  app.post('/api/register', async (req, res) => {
    try {
      const { email, password, displayName, birthDate, gender, area, menuSelection, additionalDetails, filePath, fileSize } = req.body;

      // Validate input fields (implement validation logic or use a library like express-validator)
      if (!email || !password || !displayName || !birthDate || !gender || !area || !menuSelection || !filePath || !fileSize) {
        return res.status(400).send({ error: 'All fields are required' });
      }

      // Additional validation can be added here (e.g., email format, password policy, etc.)

      // Check if the email is already registered
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).send({ error: 'Email already in use' });
      }

      // Encrypt the password before saving
      const salt = await bcrypt.genSalt(10);
      const encryptedPassword = await bcrypt.hash(password, salt);

      // Create a new user with encrypted password and other details
      const user = new User({ email, password: encryptedPassword, displayName, birthDate, gender, accountVerified: false });
      await user.save();

      // Create a new request record linked to the user
      const request = new Request({ area, menuSelection, additionalDetails, status: 'pending', user_id: user._id });
      await request.save();

      // Create a new photo record linked to the request
      const photo = new Photo({ filePath, fileSize, request_id: request._id });
      await photo.save();

      // Generate email verification token
      const verificationToken = crypto.randomBytes(20).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

      // Save the verification token
      const passwordResetLink = new PasswordResetLink({
        token: verificationToken,
        expires_at: expiresAt,
        used: false,
        user_id: user._id
      });
      await passwordResetLink.save();

      // Send verification email
      await sendVerificationEmail(user.email, verificationToken);

      // Return success message
      res.send({ message: 'Account and request created. Verification email sent.' });
    } catch (error) {
      console.error('Error during user registration:', error);
      res.status(500).send({ error: 'Internal server error' });
    }
  });

  // New route handler for email verification
  app.get('/api/verify_email/:token', async (req, res) => {
    try {
      const { token } = req.params;
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
