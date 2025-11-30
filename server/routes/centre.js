const express = require("express");
const RDV = require("../models/RDV");
const Slot = require("../models/Slot");
const Prestation = require("../models/Prestation");
const authCentre = require("../middleware/authCentre");

const router = express.Router();

// @route   GET /api/centre/rdvs
// @desc    Get all RDVs for the connected centre
// @access  Private (Centre)
router.get("/rdvs", authCentre, async (req, res) => {
  try {
    const centreId = req.user.centreId;
    
    const rdvs = await RDV.find({ centreId })
      .populate("prestationId")
      .sort({ date: 1, heure: 1 });
    
    res.json(rdvs);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   GET /api/centre/stats
// @desc    Get stats for the connected centre
// @access  Private (Centre)
router.get("/stats", authCentre, async (req, res) => {
  try {
    const centreId = req.user.centreId;
    
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    const allRDV = await RDV.find({ centreId })
      .populate("prestationId")
      .sort({ date: -1 });

    const weekRDV = allRDV.filter(r => {
      const rdvDate = new Date(r.date);
      rdvDate.setHours(0, 0, 0, 0);
      return rdvDate >= weekStart && rdvDate <= now;
    });

    const monthRDV = allRDV.filter(r => {
      const rdvDate = new Date(r.date);
      rdvDate.setHours(0, 0, 0, 0);
      return rdvDate >= monthStart && rdvDate <= now;
    });

    const upcomingRDV = allRDV.filter(r => {
      const rdvDate = new Date(r.date);
      rdvDate.setHours(0, 0, 0, 0);
      return rdvDate >= now;
    });

    const completedRDV = allRDV.filter(r => r.status === "completed");
    
    let revenue = 0;
    monthRDV.forEach(r => {
      revenue += parseFloat(r.prestationId?.prix || 0);
    });

    res.json({
      total: allRDV.length,
      weekCount: weekRDV.length,
      monthCount: monthRDV.length,
      upcomingCount: upcomingRDV.length,
      completedCount: completedRDV.length,
      revenue: Math.round(revenue * 100) / 100
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   PATCH /api/centre/rdv/:id/status
// @desc    Update RDV status (done, cancelled)
// @access  Private (Centre)
router.patch("/rdv/:id/status", authCentre, async (req, res) => {
  try {
    const { status } = req.body;
    const centreId = req.user.centreId;
    
    if (!["completed", "cancelled", "confirmed", "pending"].includes(status)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    const rdv = await RDV.findById(req.params.id);
    
    if (!rdv) {
      return res.status(404).json({ message: "RDV non trouvé" });
    }

    if (rdv.centreId.toString() !== centreId.toString()) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    rdv.status = status;
    await rdv.save();
    await rdv.populate("prestationId");
    
    res.json({ success: true, rdv });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   GET /api/centre/slots
// @desc    Get all slots for the connected centre
// @access  Private (Centre)
router.get("/slots", authCentre, async (req, res) => {
  try {
    const centreId = req.user.centreId;
    
    const slots = await Slot.find({ centreId })
      .sort({ date: 1, hour: 1 });
    
    res.json(slots);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   DELETE /api/centre/slot/:id
// @desc    Delete a slot
// @access  Private (Centre)
router.delete("/slot/:id", authCentre, async (req, res) => {
  try {
    const centreId = req.user.centreId;
    
    const slot = await Slot.findById(req.params.id);
    
    if (!slot) {
      return res.status(404).json({ message: "Créneau non trouvé" });
    }

    if (slot.centreId.toString() !== centreId.toString()) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    await Slot.deleteOne({ _id: slot._id });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   POST /api/centre/slots/generate
// @desc    Generate slots automatically for the connected centre
// @access  Private (Centre)
router.post("/slots/generate", authCentre, async (req, res) => {
  try {
    const { startTime, endTime, duration, daysOfWeek } = req.body;
    const centreId = req.user.centreId;

    if (!startTime || !endTime || !duration) {
      return res.status(400).json({ 
        message: "startTime, endTime et duration requis" 
      });
    }

    const today = new Date();
    const generatedSlots = [];
    const errors = [];

    // Generate for next 30 days
    for (let i = 0; i < 30; i++) {
      const currentDay = new Date(today);
      currentDay.setDate(today.getDate() + i);
      const dayOfWeek = currentDay.getDay(); // 0 = Sunday, 6 = Saturday

      // If daysOfWeek specified, check if we should generate for this day
      if (daysOfWeek && daysOfWeek.length > 0) {
        if (!daysOfWeek.includes(dayOfWeek)) {
          continue; // Skip this day
        }
      }

      const dateStr = currentDay.toISOString().split("T")[0];

      // Parse start and end times
      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);

      let current = new Date(currentDay);
      current.setHours(startHour, startMin, 0, 0);

      const end = new Date(currentDay);
      end.setHours(endHour, endMin, 0, 0);

      while (current < end) {
        const hour = current.toTimeString().slice(0, 5);
        
        try {
          // Check if slot already exists
          const exists = await Slot.findOne({ centreId, date: dateStr, hour });
          if (!exists) {
            const slot = new Slot({ centreId, date: dateStr, hour });
            await slot.save();
            generatedSlots.push({ date: dateStr, hour });
          }
        } catch (error) {
          if (error.code !== 11000) { // Ignore duplicate key errors
            errors.push({ date: dateStr, hour, error: error.message });
          }
        }

        // Move to next slot
        current = new Date(current.getTime() + duration * 60000);
      }
    }

    res.json({ 
      success: true, 
      generated: generatedSlots.length,
      slots: generatedSlots,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   POST /api/centre/rdv/:id/confirm
// @desc    Confirm RDV and send SMS
// @access  Private (Centre)
router.post("/rdv/:id/confirm", authCentre, async (req, res) => {
  try {
    const centreId = req.user.centreId;
    const Centre = require("../models/Centre");
    const { sendConfirmationSMS } = require("../utils/textbelt");
    
    const rdv = await RDV.findById(req.params.id).populate("prestationId");
    
    if (!rdv) {
      return res.status(404).json({ message: "RDV non trouvé" });
    }

    if (rdv.centreId.toString() !== centreId.toString()) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    // Check if already confirmed
    if (rdv.status === "confirmed" && rdv.smsSent?.confirmation) {
      return res.json({ message: "RDV déjà confirmé et SMS déjà envoyé", rdv });
    }

    const centre = await Centre.findById(centreId);
    if (!centre) {
      return res.status(404).json({ message: "Centre non trouvé" });
    }

    // Initialize smsSent if not exists
    if (!rdv.smsSent) {
      rdv.smsSent = { confirmation: false, afterService: false };
    }

    // Update status to confirmed
    rdv.status = "confirmed";

    // Send confirmation SMS if not already sent
    if (!rdv.smsSent.confirmation) {
      const smsResult = await sendConfirmationSMS(rdv, centre);
      if (smsResult.success) {
        rdv.smsSent.confirmation = true;
      } else {
        console.warn("⚠️ Échec envoi SMS:", smsResult.message);
      }
    }

    await rdv.save();
    await rdv.populate("prestationId centreId");
    
    res.json({ 
      success: true, 
      message: "RDV confirmé et SMS envoyé",
      rdv 
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

module.exports = router;

