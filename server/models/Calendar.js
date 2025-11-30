const mongoose = require("mongoose");

const { Schema } = mongoose;

const calendarSchema = new Schema({
  centreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Centre",
    required: true,
    unique: true
  },
  indispos: [{
    type: Date
  }],
  slots: {
    type: mongoose.Schema.Types.Mixed,
    default: {} // Object with date strings as keys, arrays of time strings as values
  },
  defaultHours: {
    start: {
      type: String,
      default: "09:00"
    },
    end: {
      type: String,
      default: "18:00"
    }
  },
  defaultDuration: {
    type: Number,
    default: 30 // minutes between slots
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Calendar", calendarSchema);
