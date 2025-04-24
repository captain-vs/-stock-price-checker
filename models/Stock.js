const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  symbol: { type: String, required: true, unique: true },
  likes: { type: [String], default: [] } // store hashed IPs
});

module.exports = mongoose.model('Stock', stockSchema);
