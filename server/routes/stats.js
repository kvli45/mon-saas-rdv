const express = require("express");
const RDV = require("../models/RDV");
const auth = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/stats/:centreId
// @desc    Get statistics for a centre
// @access  Private
router.get("/:centreId", auth, async (req, res) => {
  try {
    const { centreId } = req.params;

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

    const prestationsMap = {};
    let revenue = 0;

    monthRDV.forEach(r => {
      const prestationName = r.prestationId?.nom || "Prestation inconnue";
      prestationsMap[prestationName] = (prestationsMap[prestationName] || 0) + 1;
      revenue += parseFloat(r.prestationId?.prix || 0);
    });

    const topPrestations = Object.entries(prestationsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    // Calculate total RDV
    const totalRDV = allRDV.length;
    
    // Calculate completed RDV
    const completedRDV = allRDV.filter(r => r.status === "completed").length;

    res.json({
      weekCount: weekRDV.length,
      monthCount: monthRDV.length,
      totalCount: totalRDV,
      completedCount: completedRDV,
      revenue: Math.round(revenue * 100) / 100,
      topPrestations,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

module.exports = router;

