import express from 'express';
import Centre from '../models/Centre.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/centres
// @desc    Get all centres
// @access  Public (for booking) / Private (for admin)
router.get('/', async (req, res) => {
  try {
    const centres = await Centre.find({ isActive: true }).sort({ name: 1 });
    res.json(centres);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// @route   GET /api/centres/:id
// @desc    Get single centre
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const centre = await Centre.findById(req.params.id);
    
    if (!centre) {
      return res.status(404).json({ message: 'Centre non trouvé' });
    }
    
    res.json(centre);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// @route   POST /api/centres
// @desc    Create centre
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const centre = new Centre(req.body);
    await centre.save();
    res.status(201).json(centre);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// @route   PUT /api/centres/:id
// @desc    Update centre
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const centre = await Centre.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!centre) {
      return res.status(404).json({ message: 'Centre non trouvé' });
    }
    
    res.json(centre);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// @route   DELETE /api/centres/:id
// @desc    Delete centre
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const centre = await Centre.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!centre) {
      return res.status(404).json({ message: 'Centre non trouvé' });
    }
    
    res.json({ message: 'Centre désactivé' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

export default router;

