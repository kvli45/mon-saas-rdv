const express = require("express");
const Prestation = require("../models/Prestation");
const auth = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/prestations/centre/:centreId
// @desc    Get prestations for a centre
// @access  Public
router.get("/centre/:centreId", async (req, res) => {
  try {
    const prestations = await Prestation.find({ 
      centreId: req.params.centreId,
      isActive: true 
    }).sort({ prix: 1 });
    
    res.json(prestations);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   POST /api/prestations
// @desc    Create prestation
// @access  Private
router.post("/", auth, async (req, res) => {
  try {
    const prestation = new Prestation(req.body);
    await prestation.save();
    res.status(201).json(prestation);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   PUT /api/prestations/:id
// @desc    Update prestation
// @access  Private
router.put("/:id", auth, async (req, res) => {
  try {
    const prestation = await Prestation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!prestation) {
      return res.status(404).json({ message: "Prestation non trouvée" });
    }
    
    res.json(prestation);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// @route   DELETE /api/prestations/:id
// @desc    Delete prestation
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const prestation = await Prestation.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!prestation) {
      return res.status(404).json({ message: "Prestation non trouvée" });
    }
    
    res.json({ message: "Prestation désactivée" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

module.exports = router;
