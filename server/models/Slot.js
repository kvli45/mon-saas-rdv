const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema({
  centreId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Centre",
    required: true
  },
  date: { 
    type: String,
    required: true
  }, // Format: YYYY-MM-DD
  hour: { 
    type: String,
    required: true
  }, // Format: HH:mm
}, {
  timestamps: true
});

// Index pour éviter les doublons
slotSchema.index({ centreId: 1, date: 1, hour: 1 }, { unique: true });

module.exports = mongoose.model("Slot", slotSchema);

