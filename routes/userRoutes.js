const express = require('express');
const userService = require('../services/userService'); // Import userService

const router = express.Router();

// PUT endpoint for resetting user password
router.put('/api/users/reset_password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Validate token length and pattern
    if (!token || token.length < 32 || /pattern_to_exclude/.test(token)) {
      return res.status(400).json({ status: 400, message: "Invalid reset token." });
    }

    // Call the userService function to reset the password
    const result = await userService.resetUserPassword(token, password);

    // If successful, send a 200 response with a success message
    res.status(200).json({
      status: 200,
      message: "Password has been reset successfully."
    });
  } catch (error) {
    // Handle different error types and send appropriate response codes and messages
    if (error.message === 'Invalid reset token.') {
      res.status(404).json({ status: 404, message: error.message });
    } else if (error.message === 'Password does not meet the policy requirements.') {
      res.status(422).json({ status: 422, message: error.message });
    } else {
      // For all other errors, send a 500 response
      res.status(500).json({ status: 500, message: "An unexpected error occurred on the server." });
    }
  }
});

module.exports = router;
