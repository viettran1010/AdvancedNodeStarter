const AWS = require('aws-sdk')
const keys = require('../config/keys')
const requireLogin = require('../middlewares/requireLogin')
const uuid = require('uuid/v1')

const s3 = new AWS.S3({
    signatureVersion: 'v4',
    region: 'ap-southeast-1',
    accessKeyId: keys.accessKeyId,
    secretAccessKey: keys.secretAccessKey
})

module.exports = app => {
    app.get('/api/upload', requireLogin, (req,res)=> {
        const key = `${req.user.id}/${uuid()}.jpeg`;

        s3.getSignedUrl('putObject', {
            Bucket: 'viet-blogs',
            ContentType: 'image/jpeg',
            Key: key
        }, (err, url)=> res.send({key, url}))
    })    
}
