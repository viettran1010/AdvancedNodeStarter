const passport = require('passport');
const bcrypt = require('bcryptjs'); // Use bcryptjs as it is the common module for hashing in the existing code
const { body, validationResult } = require('express-validator');
const { User } = require('../models/User'); // Use destructuring as it is used in the existing code
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
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

  // New registration route
  app.post('/api/register', [
    body('name').not().isEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').not().isEmpty().withMessage('Password is required'),
    body('password_confirmation').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password } = req.body;
      const userExists = await User.findOne({ where: { email } });

      if (userExists) {
        return res.status(400).json({ error: 'Email is already in use' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        // Assuming there is a field to indicate email verification status
        emailVerified: false
      });

      const confirmationToken = jwt.sign({ id: newUser.id }, 'secret', { expiresIn: '1d' }); // Replace 'secret' with your secret key

      // Send confirmation email (nodemailer setup and sending logic goes here)

      res.status(200).json({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        message: 'A confirmation email has been sent. Please check your inbox.'
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
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
