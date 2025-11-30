import mongoose from 'mongoose';

const rdvSchema = new mongoose.Schema({
  centreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Centre',
    required: true
  },
  prestationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prestation',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  heure: {
    type: String,
    required: true // Format "HH:MM"
  },
  client: {
    prenom: {
      type: String,
      required: true
    },
    nom: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    telephone: {
      type: String,
      required: true
    },
    vehicule: {
      type: String,
      default: ''
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  avisGoogleLeft: {
    type: Boolean,
    default: false
  },
  photosAccessToken: {
    type: String,
    unique: true,
    sparse: true
  },
  smsSent: {
    confirmation: {
      type: Boolean,
      default: false
    },
    afterService: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Generate unique token for photo access
rdvSchema.methods.generatePhotoToken = function() {
  return `photo_${this._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export default mongoose.model('RDV', rdvSchema);

