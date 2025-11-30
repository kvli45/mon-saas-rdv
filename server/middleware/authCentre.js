const jwt = require("jsonwebtoken");
const CentreUser = require("../models/CentreUser");

const authCentre = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "Token manquant" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret"
    );

    if (decoded.role !== "centre") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const centreUser = await CentreUser.findById(decoded.userId);
    
    if (!centreUser || !centreUser.isActive) {
      return res.status(401).json({ message: "Utilisateur invalide" });
    }

    req.user = {
      userId: decoded.userId,
      centreId: decoded.centreId,
      role: decoded.role
    };

    next();
  } catch (error) {
    res.status(401).json({ message: "Token invalide" });
  }
};

module.exports = authCentre;

