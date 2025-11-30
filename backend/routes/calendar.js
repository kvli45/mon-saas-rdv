import express from 'express';
import Calendar from '../models/Calendar.js';
import RDV from '../models/RDV.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/calendar/:centreId
// @desc    Get calendar for a centre
// @access  Public
router.get('/:centreId', async (req, res) => {
  try {
    let calendar = await Calendar.findOne({ centreId: req.params.centreId });
    
    if (!calendar) {
      // Create default calendar
      calendar = new Calendar({
        centreId: req.params.centreId,
        slots: {},
        indispos: []
      });
      await calendar.save();
    }
    
    res.json(calendar);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// @route   GET /api/calendar/:centreId/available
// @desc    Get available slots for a date and duration
// @access  Public
router.get('/:centreId/available', async (req, res) => {
  try {
    const { date, duration } = req.query;
    
    if (!date || !duration) {
      return res.status(400).json({ message: 'Date et durée requises' });
    }

    let calendar = await Calendar.findOne({ centreId: req.params.centreId });
    
    if (!calendar) {
      calendar = new Calendar({
        centreId: req.params.centreId,
        slots: {},
        indispos: []
      });
      await calendar.save();
    }

    // Get existing RDVs for this date
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const existingRDVs = await RDV.find({
      centreId: req.params.centreId,
      date: { $gte: startDate, $lte: endDate },
      status: { $in: ['pending', 'confirmed'] }
    });

    const bookedSlots = existingRDVs.map(rdv => rdv.heure);

    // Get slots for this date
    const dateStr = date.split('T')[0];
    const daySlots = calendar.slots[dateStr] || [];

    // Generate default slots if none exist
    let availableSlots = daySlots.length > 0 ? daySlots : [];
    
    if (availableSlots.length === 0) {
      // Generate default slots
      const start = calendar.defaultHours.start || '09:00';
      const end = calendar.defaultHours.end || '18:00';
      const slotDuration = calendar.defaultDuration || 30;
      
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      for (let minutes = startMinutes; minutes + parseInt(duration) <= endMinutes; minutes += slotDuration) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        availableSlots.push(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
      }
    }

    // Filter out booked slots and check if slot + duration fits
    const filteredSlots = availableSlots.filter(slot => {
      if (bookedSlots.includes(slot)) return false;
      
      // Check if slot + duration doesn't conflict with next booked slot
      const [slotHour, slotMin] = slot.split(':').map(Number);
      const slotEndMinutes = slotHour * 60 + slotMin + parseInt(duration);
      
      for (const bookedSlot of bookedSlots) {
        const [bookedHour, bookedMin] = bookedSlot.split(':').map(Number);
        const bookedMinutes = bookedHour * 60 + bookedMin;
        
        if (slotEndMinutes > bookedMinutes && slotHour * 60 + slotMin < bookedMinutes) {
          return false;
        }
      }
      
      return true;
    });

    res.json({ slots: filteredSlots });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// @route   POST /api/calendar/:centreId/slots
// @desc    Add/update slots for a date
// @access  Private
router.post('/:centreId/slots', protect, async (req, res) => {
  try {
    const { date, slots } = req.body;
    
    if (!date || !Array.isArray(slots)) {
      return res.status(400).json({ message: 'Date et slots requis' });
    }

    let calendar = await Calendar.findOne({ centreId: req.params.centreId });
    
    if (!calendar) {
      calendar = new Calendar({ centreId: req.params.centreId });
    }

    const dateStr = date.split('T')[0];
    if (!calendar.slots) calendar.slots = {};
    calendar.slots[dateStr] = slots;
    await calendar.save();

    res.json(calendar);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// @route   POST /api/calendar/:centreId/indispo
// @desc    Mark date as unavailable
// @access  Private
router.post('/:centreId/indispo', protect, async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ message: 'Date requise' });
    }

    let calendar = await Calendar.findOne({ centreId: req.params.centreId });
    
    if (!calendar) {
      calendar = new Calendar({ centreId: req.params.centreId });
    }

    const dateObj = new Date(date);
    if (!calendar.indispos.some(d => d.toDateString() === dateObj.toDateString())) {
      calendar.indispos.push(dateObj);
      await calendar.save();
    }

    res.json(calendar);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// @route   DELETE /api/calendar/:centreId/indispo/:date
// @desc    Remove date from unavailable
// @access  Private
router.delete('/:centreId/indispo/:date', protect, async (req, res) => {
  try {
    let calendar = await Calendar.findOne({ centreId: req.params.centreId });
    
    if (!calendar) {
      return res.status(404).json({ message: 'Calendrier non trouvé' });
    }

    const dateObj = new Date(req.params.date);
    calendar.indispos = calendar.indispos.filter(
      d => d.toDateString() !== dateObj.toDateString()
    );
    
    await calendar.save();
    res.json(calendar);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

export default router;

