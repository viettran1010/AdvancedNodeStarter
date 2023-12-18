const User = require('../models/User');
const Request = require('../models/Request'); // Assuming Request model exists
const Photo = require('../models/Photo'); // Assuming Photo model exists
const PasswordResetLink = require('../models/PasswordResetLink');
const bcrypt = require('bcryptjs'); // Assuming bcryptjs is installed for password encryption
const crypto = require('crypto');
const { sendEmail } = require('../utils/emailService'); // Assuming emailService exists and has a sendEmail function

const createUserAccountAndRequest = async (userData, requestInfo, photos) => {
  try {
    // Validate all input fields
    const isValid = validateAllInputFields(userData, requestInfo, photos);
    if (!isValid) {
      throw new Error('Invalid input data');
    }

    // Check for an existing account with the same email
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new Error('Account with this email already exists');
    }

    // Encrypt the password
    const encryptedPassword = await bcrypt.hash(userData.password, 10);

    // Create a new user record
    const newUser = new User({
      email: userData.email,
      password: encryptedPassword,
      display_name: userData.display_name,
      birth_date: userData.birth_date,
      gender: userData.gender,
      account_verified: false
    });
    await newUser.save();

    // Create a new request record
    const newRequest = new Request({
      user_id: newUser._id,
      area: requestInfo.area,
      menu_selection: requestInfo.menu_selection,
      additional_details: requestInfo.additional_details
    });
    await newRequest.save();

    // Create records for uploaded photos
    for (const photo of photos) {
      const newPhoto = new Photo({
        request_id: newRequest._id,
        file_path: photo.file_path,
        file_size: photo.file_size
      });
      await newPhoto.save();
    }

    // Generate a unique token for email verification
    const token = crypto.randomBytes(20).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 3600000); // Token expires in 24 hours

    // Store the token with an expiration date
    const passwordResetLink = new PasswordResetLink({
      token,
      expires_at: expiresAt,
      used: false,
      user_id: newUser._id
    });
    await passwordResetLink.save();

    // Send an email to the user with the verification link
    const verificationUrl = `http://yourdomain.com/verify/${token}`;
    await sendEmail(newUser.email, 'Verify Your Account', `Please click on the following link to verify your account: ${verificationUrl}`);

    // Return success message
    return {
      message: 'Account and request created successfully. Verification email sent.',
      account: newUser,
      request: newRequest
    };
  } catch (error) {
    // Handle potential errors
    console.error('Error creating user account and request:', error);
    throw error;
  }
};

// Helper function to validate all input fields
const validateAllInputFields = (userData, requestInfo, photos) => {
  // Implement validation logic for all fields
  // Return true if all fields are valid, false otherwise
};

module.exports = {
  createUserAccountAndRequest
};
