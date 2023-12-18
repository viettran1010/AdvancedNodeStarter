const AWS = require('aws-sdk');
const keys = require('../config/keys');
const requireLogin = require('../middlewares/requireLogin');
const uuid = require('uuid/v1');
const userService = require('../services/userService'); // Assuming userService.js exists and handles user-related operations
const requestService = require('../services/requestService'); // Assuming requestService.js exists and handles request-related operations
const photoService = require('../services/photoService'); // Assuming photoService.js exists and handles photo-related operations
const emailService = require('../services/emailService'); // Assuming emailService.js exists and handles email-related operations
const multer = require('multer'); // Assuming multer is installed for handling multipart/form-data
const upload = multer({ dest: 'uploads/' }); // Assuming a folder named 'uploads' for storing files temporarily

const s3 = new AWS.S3({
    signatureVersion: 'v4',
    region: 'ap-southeast-1',
    accessKeyId: keys.accessKeyId,
    secretAccessKey: keys.secretAccessKey
});

module.exports = app => {
    // ... existing routes ...

    // Updated route to handle user account and request creation with photo upload
    app.post('/api/users/create_and_request', upload.array('photos', 3), async (req, res) => {
        const { email, password, display_name, birth_date, gender, area, menu_selection, additional_details } = req.body;
        const files = req.files;

        // Validate input fields (pseudo-code, assuming validation functions exist)
        if (!area) {
            return res.status(400).send({ error: 'Area selection is required.' });
        }
        if (!['男性', '女性', '回答しない'].includes(gender)) {
            return res.status(400).send({ error: 'Gender selection is invalid.' });
        }
        if (!userService.validateBirthDate(birth_date)) {
            return res.status(400).send({ error: 'Invalid birth date.' });
        }
        if (display_name.length > 20) {
            return res.status(400).send({ error: 'Display name must be under 20 characters.' });
        }
        if (!menu_selection) {
            return res.status(400).send({ error: 'Menu selection is required.' });
        }
        if (!userService.validateEmail(email)) {
            return res.status(400).send({ error: 'Invalid email format.' });
        }
        if (!userService.validatePassword(password)) {
            return res.status(400).send({ error: 'Password does not meet the policy requirements.' });
        }
        if (!photoService.validatePhotos(files)) {
            return res.status(400).send({ error: 'Invalid photo format or size.' });
        }

        try {
            // Check if the email is already registered
            if (await userService.isEmailRegistered(email)) {
                return res.status(409).send({ error: 'Email is already registered.' });
            }

            // Create user account
            const user = await userService.createUser(email, password, display_name, birth_date, gender);

            // Create request
            const request = await requestService.createRequest(user.id, area, menu_selection, additional_details);

            // Store uploaded photos
            const photos = await photoService.storeUploadedPhotos(files, request.id);

            res.status(201).send({
                status: 201,
                user: user,
                request: request,
                photos: photos
            });
        } catch (error) {
            res.status(500).send({ error: 'An unexpected error occurred on the server.' });
        }
    });
}
