const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/rdv-app")
  .then(() => console.log("✅ MongoDB connecté"))
  .catch(err => console.error("❌ Erreur MongoDB:", err));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/centres", require("./routes/centres"));
app.use("/api/prestations", require("./routes/prestations"));
app.use("/api/rdv", require("./routes/rdv"));
app.use("/api/photos", require("./routes/photos"));
app.use("/api/calendar", require("./routes/calendar"));
app.use("/api/stats", require("./routes/stats"));
app.use("/api/centre-auth", require("./routes/centreAuth"));
app.use("/api/centre", require("./routes/centre"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "RDV SaaS API is running" });
});

module.exports = app;

