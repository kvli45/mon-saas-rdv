const express = require("express");
const Centre = require("../models/Centre");
const CentreUser = require("../models/CentreUser");
const auth = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/centres
// @desc    Get all centres
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const centres = await Centre.find({ isActive: true }).sort({ name: 1 });
    res.json(centres);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   GET /api/centres/map/all
// @desc    Get all centres with coordinates for map
// @access  Private
router.get("/map/all", auth, async (req, res) => {
  try {
    const centres = await Centre.find({ 
      isActive: true
    }).select("name address city region lat lng phone email _id");
    
    res.json(centres);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   GET /api/centres/:id
// @desc    Get single centre (public for booking page)
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const centre = await Centre.findById(req.params.id);
    
    if (!centre || !centre.isActive) {
      return res.status(404).json({ message: "Centre non trouvé" });
    }
    
    res.json(centre);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   POST /api/centres
// @desc    Create new centre
// @access  Private
router.post("/", auth, async (req, res) => {
  try {
    const { partnerEmail, partnerPassword, partnerName, ...centreData } = req.body;
    
    // Create centre
    const newCentre = new Centre(centreData);
    const saved = await newCentre.save();

    // Create partner user if credentials provided
    if (partnerEmail && partnerPassword) {
      try {
        const centreUser = new CentreUser({
          centreId: saved._id,
          email: partnerEmail,
          password: partnerPassword,
          name: partnerName || saved.name,
          isActive: true
        });
        await centreUser.save();
        console.log(`✅ Compte partenaire créé pour ${saved.name}`);
      } catch (userError) {
        console.error("⚠️ Erreur création compte partenaire:", userError.message);
        // Continue even if user creation fails
      }
    }

    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   PUT /api/centres/:id
// @desc    Update centre
// @access  Private
router.put("/:id", auth, async (req, res) => {
  try {
    const centre = await Centre.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!centre) {
      return res.status(404).json({ message: "Centre non trouvé" });
    }
    
    res.json(centre);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   DELETE /api/centres/:id
// @desc    Delete centre
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const centre = await Centre.findById(req.params.id);
    
    if (!centre) {
      return res.status(404).json({ message: "Centre non trouvé" });
    }

    // Delete associated CentreUser
    const CentreUser = require("../models/CentreUser");
    await CentreUser.deleteMany({ centreId: centre._id });

    // Delete the centre
    await Centre.deleteOne({ _id: centre._id });
    
    res.json({ message: "Centre supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   POST /api/centres/:id/partner-account
// @desc    Create partner account for a centre
// @access  Private
router.post("/:id/partner-account", auth, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const centreId = req.params.id;

    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    // Check if centre exists
    const centre = await Centre.findById(centreId);
    if (!centre) {
      return res.status(404).json({ message: "Centre non trouvé" });
    }

    // Check if account already exists
    const existingUser = await CentreUser.findOne({ centreId });
    if (existingUser) {
      return res.status(400).json({ message: "Un compte partenaire existe déjà pour ce centre" });
    }

    // Check if email is already used
    const emailExists = await CentreUser.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }

    // Create partner account
    const centreUser = new CentreUser({
      centreId,
      email,
      password,
      name: name || centre.name,
      isActive: true
    });

    await centreUser.save();

    res.status(201).json({
      success: true,
      message: "Compte partenaire créé avec succès",
      user: {
        id: centreUser._id,
        email: centreUser.email,
        name: centreUser.name
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   GET /api/centres/:id/partner-account
// @desc    Get partner account for a centre
// @access  Private
router.get("/:id/partner-account", auth, async (req, res) => {
  try {
    const centreId = req.params.id;

    const centreUser = await CentreUser.findOne({ centreId }).select("-password");
    
    if (!centreUser) {
      return res.json({ exists: false });
    }

    res.json({
      exists: true,
      user: {
        id: centreUser._id,
        email: centreUser.email,
        name: centreUser.name,
        isActive: centreUser.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   PUT /api/centres/:id/partner-account
// @desc    Update partner account for a centre
// @access  Private
router.put("/:id/partner-account", auth, async (req, res) => {
  try {
    const { email, password, name, isActive } = req.body;
    const centreId = req.params.id;

    const centreUser = await CentreUser.findOne({ centreId });
    
    if (!centreUser) {
      return res.status(404).json({ message: "Compte partenaire non trouvé" });
    }

    if (email && email !== centreUser.email) {
      const emailExists = await CentreUser.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: "Cet email est déjà utilisé" });
      }
      centreUser.email = email;
    }

    if (password) {
      centreUser.password = password; // Will be hashed by pre-save hook
    }

    if (name) {
      centreUser.name = name;
    }

    if (typeof isActive === "boolean") {
      centreUser.isActive = isActive;
    }

    await centreUser.save();

    res.json({
      success: true,
      message: "Compte partenaire mis à jour",
      user: {
        id: centreUser._id,
        email: centreUser.email,
        name: centreUser.name,
        isActive: centreUser.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

module.exports = router;
