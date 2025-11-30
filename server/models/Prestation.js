const mongoose = require("mongoose");

const prestationSchema = new mongoose.Schema({
  centreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Centre",
    required: true
  },
  nom: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ""
  },
  duree: {
    type: Number,
    required: true,
    min: 15 // durée minimum en minutes
  },
  prix: {
    type: Number,
    required: true,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Prestation", prestationSchema);
