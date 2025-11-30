const express = require("express");
const RDV = require("../models/RDV");
const Centre = require("../models/Centre");
const Prestation = require("../models/Prestation");
const Slot = require("../models/Slot");
const auth = require("../middleware/auth");
const authCentre = require("../middleware/authCentre");
const { sendConfirmationSMS, sendAfterServiceSMS, sendCentreNotificationSMS } = require("../utils/textbelt");

const router = express.Router();

// @route   POST /api/rdv
// @desc    Create RDV
// @access  Public
router.post("/", async (req, res) => {
  try {
    const { centreId, prestationId, date, heure, client } = req.body;

    // Validate
    const prestation = await Prestation.findById(prestationId);
    if (!prestation) {
      return res.status(404).json({ message: "Prestation non trouvée" });
    }

    // Check if slot is available (check both Slot model and existing RDVs)
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Check existing RDVs
    const existingRDV = await RDV.findOne({
      centreId,
      date: { $gte: dateObj, $lte: endDate },
      heure,
      status: { $in: ["pending", "confirmed"] }
    });

    if (existingRDV) {
      return res.status(400).json({ message: "Créneau déjà réservé" });
    }

    // Check if slot exists in Slot model (optional - for manual slot management)
    const dateStr = date.split("T")[0];
    const slot = await Slot.findOne({ centreId, date: dateStr, hour: heure });
    
    // Get centre
    const centre = await Centre.findById(centreId);
    if (!centre) {
      return res.status(404).json({ message: "Centre non trouvé" });
    }

    const rdv = new RDV({
      centreId,
      prestationId,
      date: new Date(date),
      heure,
      client,
      status: "pending"
    });

    await rdv.save();
    await rdv.populate("centreId prestationId");

    // Delete slot if it exists (manual slot management)
    if (slot) {
      await Slot.deleteOne({ _id: slot._id });
    }

    // Send confirmation SMS to client
    sendConfirmationSMS(rdv, centre).then(result => {
      if (result.success) {
        rdv.smsSent.confirmation = true;
        rdv.save();
      }
    });

    // Send notification SMS to centre
    sendCentreNotificationSMS(rdv, centre).then(result => {
      if (result.success) {
        console.log(`✅ SMS envoyé au centre ${centre.name}`);
      } else {
        console.warn(`⚠️ Échec envoi SMS au centre: ${result.message}`);
      }
    });

    res.status(201).json(rdv);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   POST /api/rdv/book
// @desc    Book RDV (alternative route with slot validation)
// @access  Public
router.post("/book", async (req, res) => {
  try {
    const { centreId, prestationId, date, hour, client } = req.body;

    // Validate inputs
    if (!centreId || !prestationId || !date || !hour || !client) {
      return res.status(400).json({ message: "Tous les champs sont requis" });
    }

    // Validate prestation
    const prestation = await Prestation.findById(prestationId);
    if (!prestation) {
      return res.status(404).json({ message: "Prestation non trouvée" });
    }

    // Check if slot is available in Slot model
    const dateStr = date.split("T")[0];
    const slot = await Slot.findOne({ centreId, date: dateStr, hour });
    
    if (!slot) {
      // Check if slot is available via existing RDVs
      const dateObj = new Date(date);
      dateObj.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const existingRDV = await RDV.findOne({
        centreId,
        date: { $gte: dateObj, $lte: endDate },
        heure: hour,
        status: { $in: ["pending", "confirmed"] }
      });

      if (existingRDV) {
        return res.status(400).json({ message: "Créneau non disponible" });
      }
    }

    // Get centre
    const centre = await Centre.findById(centreId);
    if (!centre) {
      return res.status(404).json({ message: "Centre non trouvé" });
    }

    // Create RDV
    const rdv = new RDV({
      centreId,
      prestationId,
      date: new Date(date),
      heure: hour,
      client: {
        prenom: client.prenom || client.clientName?.split(" ")[0] || "",
        nom: client.nom || client.clientName?.split(" ").slice(1).join(" ") || "",
        email: client.email || "",
        telephone: client.telephone || client.phone || "",
        vehicule: client.vehicule || ""
      },
      status: "pending"
    });

    await rdv.save();
    await rdv.populate("centreId prestationId");

    // Delete slot if it exists (manual slot management)
    if (slot) {
      await Slot.deleteOne({ _id: slot._id });
    }

    // Send confirmation SMS to client
    sendConfirmationSMS(rdv, centre).then(result => {
      if (result.success) {
        rdv.smsSent.confirmation = true;
        rdv.save();
      }
    });

    // Send notification SMS to centre
    sendCentreNotificationSMS(rdv, centre).then(result => {
      if (result.success) {
        console.log(`✅ SMS envoyé au centre ${centre.name}`);
      } else {
        console.warn(`⚠️ Échec envoi SMS au centre: ${result.message}`);
      }
    });

    res.status(201).json({ success: true, rdvId: rdv._id, rdv });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   GET /api/rdv/:id
// @desc    Get single RDV
// @access  Public (with token for photos) or Private (for admin)
router.get("/:id", async (req, res) => {
  try {
    // Check if user is authenticated (admin)
    const isAdmin = req.headers.authorization && req.headers.authorization.startsWith("Bearer");
    
    let rdv;
    if (isAdmin) {
      // Admin can see all details
      rdv = await RDV.findById(req.params.id)
        .populate("centreId prestationId");
    } else {
      // Public access (for client with token)
      rdv = await RDV.findById(req.params.id)
        .populate("centreId prestationId");
    }
    
    if (!rdv) {
      return res.status(404).json({ message: "RDV non trouvé" });
    }
    
    res.json(rdv);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   GET /api/rdv/centre/:centreId
// @desc    Get all RDVs for a centre
// @access  Private
router.get("/centre/:centreId", auth, async (req, res) => {
  try {
    const rdvs = await RDV.find({ centreId: req.params.centreId })
      .populate("prestationId")
      .sort({ date: -1, heure: -1 });
    
    res.json(rdvs);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   GET /api/rdv/by-centre/:centreId
// @desc    Get all RDVs for a centre (alias)
// @access  Private (Admin or Centre)
router.get("/by-centre/:centreId", async (req, res) => {
  try {
    // Check if admin or centre auth
    const token = req.header("Authorization")?.replace("Bearer ", "");
    let isAuthorized = false;
    let userCentreId = null;

    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret");
        if (decoded.role === "admin" || decoded.role === "closeur") {
          isAuthorized = true;
        } else if (decoded.role === "centre") {
          userCentreId = decoded.centreId;
          // Centre can only access their own RDVs
          if (userCentreId && userCentreId.toString() === req.params.centreId) {
            isAuthorized = true;
          }
        }
      } catch (e) {
        // Invalid token
      }
    }

    if (!isAuthorized) {
      return res.status(401).json({ message: "Non autorisé" });
    }

    const rdvs = await RDV.find({ centreId: req.params.centreId })
      .populate("prestationId centreId")
      .sort({ date: -1, heure: -1 });
    
    res.json(rdvs);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   PUT /api/rdv/:id/status
// @desc    Update RDV status
// @access  Private (Admin or Centre)
router.put("/:id/status", async (req, res) => {
  try {
    // Check if admin or centre auth
    const token = req.header("Authorization")?.replace("Bearer ", "");
    let isAdmin = false;
    let centreId = null;

    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret");
        if (decoded.role === "admin" || decoded.role === "closeur") {
          isAdmin = true;
        } else if (decoded.role === "centre") {
          centreId = decoded.centreId;
        }
      } catch (e) {
        // Invalid token
      }
    }

    if (!isAdmin && !centreId) {
      return res.status(401).json({ message: "Non autorisé" });
    }

    const { status } = req.body;
    
    const rdv = await RDV.findById(req.params.id);
    
    if (!rdv) {
      return res.status(404).json({ message: "RDV non trouvé" });
    }

    // Centre can only update their own RDVs
    if (centreId && rdv.centreId.toString() !== centreId.toString()) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    rdv.status = status;

    // If completed, generate photo token and send SMS
    if (status === "completed" && !rdv.photosAccessToken) {
      rdv.photosAccessToken = rdv.generatePhotoToken();
      
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

    await rdv.save();
    await rdv.populate("centreId prestationId");
    
    res.json(rdv);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   PUT /api/rdv/:id/avis
// @desc    Mark Google review as left (PUT method)
// @access  Public (for client)
router.put("/:id/avis", async (req, res) => {
  try {
    const { token } = req.body;
    
    const rdv = await RDV.findById(req.params.id);
    
    if (!rdv) {
      return res.status(404).json({ message: "RDV non trouvé" });
    }

    // Verify token if provided (optional for flexibility)
    if (token && rdv.photosAccessToken && rdv.photosAccessToken !== token) {
      return res.status(401).json({ message: "Token invalide" });
    }

    rdv.avisGoogleLeft = true;
    await rdv.save();
    
    res.json({ success: true, message: "Avis enregistré", rdv });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   POST /api/rdv/:id/avis
// @desc    Mark Google review as left (POST method - alternative)
// @access  Public (for client)
router.post("/:id/avis", async (req, res) => {
  try {
    const { token } = req.body;
    
    const rdv = await RDV.findById(req.params.id);
    
    if (!rdv) {
      return res.status(404).json({ message: "RDV introuvable" });
    }

    // Verify token if provided (optional for flexibility)
    if (token && rdv.photosAccessToken && rdv.photosAccessToken !== token) {
      return res.status(401).json({ message: "Token invalide" });
    }

    rdv.avisGoogleLeft = true;
    await rdv.save();
    
    res.json({ success: true, message: "Avis enregistré" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   POST /api/rdv/send-confirmation/:rdvId
// @desc    Send confirmation SMS
// @access  Private
router.post("/send-confirmation/:rdvId", auth, async (req, res) => {
  try {
    const rdv = await RDV.findById(req.params.rdvId).populate("centreId prestationId");
    
    if (!rdv) {
      return res.status(404).json({ message: "RDV introuvable" });
    }

    const centre = await Centre.findById(rdv.centreId);
    if (!centre) {
      return res.status(404).json({ message: "Centre introuvable" });
    }

    // Send SMS using existing utility
    const result = await sendConfirmationSMS(rdv, centre);
    
    if (!result.success) {
      return res.status(500).json({ message: "Erreur lors de l'envoi du SMS", error: result.error || result.message });
    }

    // Mark as confirmed and update SMS sent status
    rdv.status = "confirmed";
    rdv.smsSent.confirmation = true;
    await rdv.save();
    
    res.json({ success: true, message: "SMS envoyé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   POST /api/rdv/send-after-service/:rdvId
// @desc    Send after service SMS with photos link
// @access  Private
router.post("/send-after-service/:rdvId", auth, async (req, res) => {
  try {
    const rdv = await RDV.findById(req.params.rdvId).populate("centreId prestationId");
    
    if (!rdv) {
      return res.status(404).json({ message: "RDV introuvable" });
    }

    const centre = await Centre.findById(rdv.centreId);
    if (!centre) {
      return res.status(404).json({ message: "Centre introuvable" });
    }

    // Generate photo token if not exists
    if (!rdv.photosAccessToken) {
      rdv.photosAccessToken = rdv.generatePhotoToken();
      await rdv.save();
    }

    // Send SMS with photos link
    console.log(`📲 Envoi SMS après service pour RDV ${rdv._id}...`);
    const result = await sendAfterServiceSMS(rdv, centre, rdv.photosAccessToken);
    
    console.log("📥 Résultat SMS:", result);
    
    if (!result.success) {
      console.error("❌ Échec envoi SMS:", result);
      return res.status(500).json({ 
        message: "Erreur lors de l'envoi du SMS", 
        error: result.error || result.message || "Erreur inconnue",
        details: result.details || null
      });
    }

    // Update SMS sent status
    rdv.smsSent.afterService = true;
    rdv.status = "completed"; // Mark as completed
    await rdv.save();
    
    res.json({ 
      success: true, 
      message: "SMS envoyé avec succès",
      photoToken: rdv.photosAccessToken,
      photoUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/rdv/${rdv._id}/photos?token=${rdv.photosAccessToken}`
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// ==================== SLOTS MANAGEMENT ====================

// @route   GET /api/rdv/slots/:centreId
// @desc    Get slots for a date
// @access  Private
router.get("/slots/:centreId", auth, async (req, res) => {
  try {
    const { date } = req.query;
    const { centreId } = req.params;

    if (!date) {
      return res.status(400).json({ message: "Date requise" });
    }

    const slots = await Slot.find({ centreId, date }).select("hour -_id").sort({ hour: 1 });
    res.json(slots.map(s => s.hour));
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   POST /api/rdv/slots
// @desc    Add slot
// @access  Private
router.post("/slots", auth, async (req, res) => {
  try {
    const { centreId, date, hour } = req.body;

    if (!centreId || !date || !hour) {
      return res.status(400).json({ message: "centreId, date et hour requis" });
    }

    // Validate hour format (HH:mm)
    const hourRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!hourRegex.test(hour)) {
      return res.status(400).json({ message: "Format d'heure invalide (HH:mm)" });
    }

    const exists = await Slot.findOne({ centreId, date, hour });
    if (exists) {
      return res.status(400).json({ message: "Créneau déjà existant" });
    }

    const newSlot = new Slot({ centreId, date, hour });
    await newSlot.save();
    res.status(201).json({ success: true, slot: newSlot });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Créneau déjà existant" });
    }
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   DELETE /api/rdv/slots
// @desc    Delete slot
// @access  Private
router.delete("/slots", auth, async (req, res) => {
  try {
    const { centreId, date, hour } = req.body;

    if (!centreId || !date || !hour) {
      return res.status(400).json({ message: "centreId, date et hour requis" });
    }

    const deleted = await Slot.findOneAndDelete({ centreId, date, hour });
    
    if (!deleted) {
      return res.status(404).json({ message: "Créneau non trouvé" });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   GET /api/rdv/slots/all/:centreId
// @desc    Get all slots for a centre grouped by date
// @access  Private
router.get("/slots/all/:centreId", auth, async (req, res) => {
  try {
    const { centreId } = req.params;
    
    const slots = await Slot.find({ centreId });
    
    // Group slots by date
    const grouped = {};
    slots.forEach(slot => {
      const dateStr = slot.date instanceof Date 
        ? slot.date.toISOString().split("T")[0] 
        : slot.date;
      
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(slot.hour);
    });
    
    // Convert to array format
    const result = Object.entries(grouped).map(([date, hours]) => ({ 
      date, 
      hours: hours.sort() 
    }));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   POST /api/rdv/slots/generate
// @desc    Generate slots automatically for a centre
// @access  Private
router.post("/slots/generate", auth, async (req, res) => {
  try {
    const { centreId, startTime, endTime, duration, daysOfWeek } = req.body;

    if (!centreId || !startTime || !endTime || !duration) {
      return res.status(400).json({ 
        message: "centreId, startTime, endTime et duration requis" 
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

module.exports = router;
