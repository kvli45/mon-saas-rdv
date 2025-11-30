const express = require("express");
const jwt = require("jsonwebtoken");
const CentreUser = require("../models/CentreUser");
const Centre = require("../models/Centre");
const authCentre = require("../middleware/authCentre");

const router = express.Router();

// @route   POST /api/centre-auth/login
// @desc    Login for centre partner
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    const centreUser = await CentreUser.findOne({ email }).populate("centreId");
    
    if (!centreUser || !centreUser.isActive) {
      return res.status(401).json({ message: "Identifiants incorrects" });
    }

    const isMatch = await centreUser.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: "Identifiants incorrects" });
    }

    const token = jwt.sign(
      { 
        userId: centreUser._id, 
        centreId: centreUser.centreId._id,
        role: "centre" 
      },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: centreUser._id,
        email: centreUser.email,
        name: centreUser.name,
        centreId: centreUser.centreId._id,
        centreName: centreUser.centreId.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   GET /api/centre-auth/me
// @desc    Get current centre user
// @access  Private (Centre)
router.get("/me", authCentre, async (req, res) => {
  try {
    const centreUser = await CentreUser.findById(req.user.userId)
      .populate("centreId");
    
    if (!centreUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.json({
      user: {
        id: centreUser._id,
        email: centreUser.email,
        name: centreUser.name,
        centreId: centreUser.centreId._id,
        centreName: centreUser.centreId.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

module.exports = router;

