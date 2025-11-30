const mongoose = require("mongoose");

const centreSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  logoUrl: {
    type: String,
    default: ""
  },
  phone: {
    type: String,
    default: ""
  },
  email: {
    type: String,
    default: ""
  },
  googleReviewLink: {
    type: String,
    default: ""
  },
  googleMapsLink: {
    type: String,
    default: ""
  },
  address: {
    type: String,
    default: ""
  },
  city: {
    type: String,
    default: ""
  },
  region: {
    type: String,
    default: ""
  },
  lat: {
    type: Number,
    default: null
  },
  lng: {
    type: Number,
    default: null
  },
  prestations: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Prestation" 
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Centre", centreSchema);
