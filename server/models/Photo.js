const mongoose = require("mongoose");

const photoSchema = new mongoose.Schema({
  rdvId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RDV",
    required: true
  },
  type: {
    type: String,
    enum: ["before", "after"],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Photo", photoSchema);
