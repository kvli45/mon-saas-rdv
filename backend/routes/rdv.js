import express from 'express';
import RDV from '../models/RDV.js';
import Centre from '../models/Centre.js';
import Prestation from '../models/Prestation.js';
import { protect } from '../middleware/auth.js';
import { sendConfirmationSMS, sendAfterServiceSMS } from '../utils/textbelt.js';

const router = express.Router();

// @route   POST /api/rdv
// @desc    Create RDV
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { centreId, prestationId, date, heure, client } = req.body;

    // Validate
    const prestation = await Prestation.findById(prestationId);
    if (!prestation) {
      return res.status(404).json({ message: 'Prestation non trouvée' });
    }

    // Check if slot is available
    const existingRDV = await RDV.findOne({
      centreId,
      date: new Date(date),
      heure,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingRDV) {
      return res.status(400).json({ message: 'Créneau déjà réservé' });
    }

    const rdv = new RDV({
      centreId,
      prestationId,
      date: new Date(date),
      heure,
      client,
      status: 'pending'
    });

    await rdv.save();
    await rdv.populate('centreId prestationId');

    // Send confirmation SMS
    const centre = await Centre.findById(centreId);
    if (centre) {
      sendConfirmationSMS(rdv, centre).then(result => {
        if (result.success) {
          rdv.smsSent.confirmation = true;
          rdv.save();
        }
      });
    }

    res.status(201).json(rdv);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// @route   GET /api/rdv/:id
// @desc    Get single RDV
// @access  Public (with token for photos)
router.get('/:id', async (req, res) => {
  try {
    const rdv = await RDV.findById(req.params.id)
      .populate('centreId prestationId');
    
    if (!rdv) {
      return res.status(404).json({ message: 'RDV non trouvé' });
    }
    
    res.json(rdv);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// @route   GET /api/rdv/centre/:centreId
// @desc    Get all RDVs for a centre
// @access  Private
router.get('/centre/:centreId', protect, async (req, res) => {
  try {
    const rdvs = await RDV.find({ centreId: req.params.centreId })
      .populate('prestationId')
      .sort({ date: -1, heure: -1 });
    
    res.json(rdvs);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// @route   PUT /api/rdv/:id/status
// @desc    Update RDV status
// @access  Private
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    
    const rdv = await RDV.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('centreId prestationId');
    
    if (!rdv) {
      return res.status(404).json({ message: 'RDV non trouvé' });
    }

    // If completed, generate photo token and send SMS
    if (status === 'completed' && !rdv.photosAccessToken) {
      rdv.photosAccessToken = rdv.generatePhotoToken();
      await rdv.save();
      
      const centre = await Centre.findById(rdv.centreId);
      if (centre) {
        sendAfterServiceSMS(rdv, centre, rdv.photosAccessToken).then(result => {
          if (result.success) {
            rdv.smsSent.afterService = true;
            rdv.save();
          }
        });
      }
    }
    
    res.json(rdv);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// @route   PUT /api/rdv/:id/avis
// @desc    Mark Google review as left
// @access  Public (for client)
router.put('/:id/avis', async (req, res) => {
  try {
    const { token } = req.body;
    
    const rdv = await RDV.findById(req.params.id);
    
    if (!rdv) {
      return res.status(404).json({ message: 'RDV non trouvé' });
    }

    // Verify token
    if (rdv.photosAccessToken !== token) {
      return res.status(401).json({ message: 'Token invalide' });
    }

    rdv.avisGoogleLeft = true;
    await rdv.save();
    
    res.json({ message: 'Avis enregistré', rdv });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

export default router;

