const mongoose = require('mongoose');
const { Schema } = mongoose;

// Existing Blog schema from the example
const blogSchema = new Schema({
  title: String,
  content: String,
  imageUrl: String,
  createdAt: { type: Date, default: Date.now },
  _user: { type: Schema.Types.ObjectId, ref: 'User' }
});

// New Request schema as per the guideline
const requestSchema = new Schema({
  area: { type: String, required: true },
  menuSelection: { type: String, required: true },
  additionalDetails: { type: String, required: false },
  _user: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

mongoose.model('Request', requestSchema);
