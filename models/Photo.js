const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the Photo schema
const photoSchema = new Schema({
  filePath: {
    type: String,
    required: [true, 'File path is required'],
    trim: true
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    validate: {
      validator: function(v) {
        // Validate that the file size is a positive number
        return v > 0;
      },
      message: props => `${props.value} is not a valid file size! File size must be a positive number.`
    }
  },
  _request: {
    type: Schema.Types.ObjectId,
    ref: 'Request',
    required: [true, 'Associated request is required']
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create the Photo model
mongoose.model('Photo', photoSchema);
