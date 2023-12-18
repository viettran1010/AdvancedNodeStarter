const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { Schema } = mongoose;

const userSchema = new Schema({
  googleId: String,
  displayName: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  display_name: { type: String, required: true },
  birth_date: { type: Date, required: true },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  account_verified: { type: Boolean, default: false }
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password') || this.isNew) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(this.password, salt);
    this.password = hash;
  }
  next();
});

mongoose.model('User', userSchema);
