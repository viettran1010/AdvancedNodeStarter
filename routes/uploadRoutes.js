const AWS = require('aws-sdk');
const keys = require('../config/keys');
const requireLogin = require('../middlewares/requireLogin');
const uuid = require('uuid/v1');
const userService = require('../services/userService'); // Assuming userService.js exists and handles user-related operations
const requestService = require('../services/requestService'); // Assuming requestService.js exists and handles request-related operations
const photoService = require('../services/photoService'); // Assuming photoService.js exists and handles photo-related operations
const emailService = require('../services/emailService'); // Assuming emailService.js exists and handles email-related operations

const s3 = new AWS.S3({
    signatureVersion: 'v4',
    region: 'ap-southeast-1',
    accessKeyId: keys.accessKeyId,
    secretAccessKey: keys.secretAccessKey
});

module.exports = app => {
    app.get('/api/upload', requireLogin, (req, res) => {
        const key = `${req.user.id}/${uuid()}.jpeg`;

        s3.getSignedUrl('putObject', {
            Bucket: 'viet-blogs',
            ContentType: 'image/jpeg',
            Key: key
        }, (err, url) => res.send({ key, url }));
    });

    app.post('/api/upload/photo', requireLogin, async (req, res) => {
        const { request_id } = req.body;
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).send({ error: 'No files uploaded.' });
        }

        try {
            const photos = await photoService.storeUploadedPhotos(files, request_id);
            res.status(201).send(photos);
        } catch (error) {
            res.status(500).send({ error: 'Error saving photo information to the database.' });
        }
    });

    // New route to handle user account and request creation
    app.post('/api/users/create', async (req, res) => {
        const { email, password, display_name, birth_date, gender, area, menu_selection, additional_details, files } = req.body;

        // Validate input fields (pseudo-code, assuming validation functions exist)
        if (!userService.validateEmail(email) || !userService.validatePassword(password) || !userService.validateDisplayName(display_name) || !userService.validateBirthDate(birth_date) || !userService.validateGender(gender)) {
            return res.status(400).send({ error: 'Invalid input data.' });
        }

        try {
            // Check if the email is already registered
            if (await userService.isEmailRegistered(email)) {
                return res.status(400).send({ error: 'Email is already registered.' });
            }

            // Create user account
            const user = await userService.createUser(email, password, display_name, birth_date, gender);

            // Create request
            const request = await requestService.createRequest(user.id, area, menu_selection, additional_details);

            // Store uploaded photos
            const photos = await photoService.storeUploadedPhotos(files, request.id);

            // Generate email verification token and send email
            const verificationToken = await userService.generateEmailVerificationToken(user.id);
            await emailService.sendVerificationEmail(email, verificationToken);

            res.status(201).send({
                message: 'Account and request created successfully. Verification email sent.',
                user: user,
                request: request,
                photos: photos
            });
        } catch (error) {
            res.status(500).send({ error: 'Error creating account and request.' });
        }
    });
}
