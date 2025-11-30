import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import Photo from '../models/Photo.js';
import RDV from '../models/RDV.js';
import { protect } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'));
    }
  }
});

const router = express.Router();

// @route   POST /api/photos
// @desc    Upload photos for RDV
// @access  Private
router.post('/', protect, upload.array('photos', 10), async (req, res) => {
  try {
    const { rdvId, type } = req.body;
    
    if (!rdvId || !type || !['before', 'after'].includes(type)) {
      return res.status(400).json({ message: 'rdvId et type (before/after) requis' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Aucune photo uploadée' });
    }

    const rdv = await RDV.findById(rdvId);
    if (!rdv) {
      return res.status(404).json({ message: 'RDV non trouvé' });
    }

    const photos = req.files.map(file => ({
      rdvId,
      type,
      url: `/uploads/${file.filename}`,
      filename: file.filename
    }));

    const savedPhotos = await Photo.insertMany(photos);
    
    res.status(201).json(savedPhotos);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// @route   GET /api/photos/rdv/:rdvId
// @desc    Get photos for RDV
// @access  Public (with token) or Private
router.get('/rdv/:rdvId', async (req, res) => {
  try {
    const { token } = req.query;
    const rdv = await RDV.findById(req.params.rdvId).populate('centreId');
    
    if (!rdv) {
      return res.status(404).json({ message: 'RDV non trouvé' });
    }

    // Check if user is admin or has valid token
    const isAdmin = req.headers.authorization && req.headers.authorization.startsWith('Bearer');
    const hasValidToken = token && rdv.photosAccessToken === token && rdv.avisGoogleLeft;

    // Try to verify admin token
    let adminVerified = false;
    if (isAdmin) {
      try {
        const authToken = req.headers.authorization.split(' ')[1];
        jwt.verify(authToken, process.env.JWT_SECRET || 'fallback-secret');
        adminVerified = true;
      } catch (e) {
        adminVerified = false;
      }
    }

    if (!adminVerified && !hasValidToken) {
      return res.status(403).json({ 
        message: 'Accès refusé. Laissez un avis Google pour accéder aux photos.',
        avisGoogleLeft: rdv.avisGoogleLeft,
        googleReviewLink: rdv.centreId?.googleReviewLink
      });
    }

    const photos = await Photo.find({ rdvId: req.params.rdvId }).sort({ type: 1, createdAt: 1 });
    res.json(photos);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// @route   DELETE /api/photos/:id
// @desc    Delete photo
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const photo = await Photo.findByIdAndDelete(req.params.id);
    
    if (!photo) {
      return res.status(404).json({ message: 'Photo non trouvée' });
    }
    
    res.json({ message: 'Photo supprimée' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

export default router;

