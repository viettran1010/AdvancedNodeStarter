const userService = require('../services/userService');
const photoService = require('../services/photoService');
const multer = require('multer');
const { validationResult } = require('express-validator');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now());
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB limit
  },
  fileFilter: fileFilter
}).array('photos', 3); // Limit to 3 photos

const userController = {
  createUserAccountAndRequest: async (req, res) => {
    upload(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          status: 400,
          message: "Invalid photo format or size."
        });
      } else if (err) {
        return res.status(500).json({
          status: 500,
          message: err.message || 'Internal Server Error'
        });
      }

      try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        // Extract parameters from req.body and perform validations
        const { area, gender, birth_date, display_name, menu_selection, additional_details, email, password } = req.body;
        const photos = req.files;

        // If validations pass, call the userService function
        const result = await userService.createUserAccountAndRequest({
          area,
          gender,
          birth_date,
          display_name,
          menu_selection,
          additional_details,
          email,
          password
        }, photos);

        // If userService is successful, store the photos using photoService
        const storedPhotos = await photoService.storePhotos(photos, result.request._id);

        // Respond with success message and data
        res.status(201).json({
          status: 201,
          user: result.account,
          request: result.request,
          photos: storedPhotos
        });
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({
            status: 409,
            message: 'The email is already registered.'
          });
        }
        // Handle other errors and respond with appropriate status code and message
        res.status(500).json({
          status: 500,
          message: error.message || 'Internal Server Error'
        });
      }
    });
  }
};

module.exports = userController;
