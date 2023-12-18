const User = require('../models/User'); // Assuming the User model exists and is at this path
const PasswordResetLink = require('../models/PasswordResetLink'); // Assuming the PasswordResetLink model exists and is at this path

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
};
