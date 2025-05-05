

const mongoose = require('mongoose');
const Schema = mongoose.Schema; // Get Schema constructor from mongoose

// Define the structure of the User document
const userSchema = new Schema({
  username: {
    type: String,
    required: true, // This field must be provided
    unique: true,   // No two users can have the same username
    trim: true,     // Removes whitespace from beginning/end
    minlength: 3    // Minimum length requirement
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true // Store email in lowercase
    // We'll add more specific email validation later if needed
  },
  password: {
    type: String,
    required: true
    // We won't store plain text passwords! Hashing comes later.
  }
  // Optional: Add timestamps for creation and updates
  // timestamps: true // Adds createdAt and updatedAt fields automatically
}, { timestamps: true }); // Enable timestamps as the second argument to the Schema constructor

// Create the User model from the schema
// Mongoose will automatically look for the plural, lowercase version
// of your model name for the collection ('User' -> 'users')
const User = mongoose.model('User', userSchema);

// Export the model so it can be used elsewhere in the application
module.exports = User;
