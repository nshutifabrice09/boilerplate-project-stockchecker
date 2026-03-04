const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  symbol: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true 
  },
  likes: { 
    type: Number, 
    default: 0 
  },
  ips: [{ 
    type: String 
  }]
});

module.exports = mongoose.model('Stock', stockSchema);