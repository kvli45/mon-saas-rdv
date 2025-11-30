const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");
const Centre = require("../models/Centre");
const CentreUser = require("../models/CentreUser");
const Prestation = require("../models/Prestation");
const Calendar = require("../models/Calendar");

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/rdv-app");
    console.log("✅ Connecté à MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Centre.deleteMany({});
    await CentreUser.deleteMany({});
    await Prestation.deleteMany({});
    await Calendar.deleteMany({});

    // Create admin user
    const admin = await User.create({
      email: "admin@leadclean.com",
      password: "admin123",
      name: "Admin Principal",
      role: "admin"
    });
    console.log("✅ Admin créé:", admin.email);

    // Create closeur user
    const closeur = await User.create({
      email: "closeur@leadclean.com",
      password: "closeur123",
      name: "Closeur Test",
      role: "closeur"
    });
    console.log("✅ Closeur créé:", closeur.email);

    // Create centre
    const centre = await Centre.create({
      name: "Lavage Pro Marseille",
      logoUrl: "/images/centre1.png",
      googleMapsLink: "https://maps.google.com/?q=Lavage+Pro+Marseille",
      googleReviewLink: "https://g.page/centre-lavage-pro",
      email: "contact@lavagepromarseille.fr",
      phone: "+33612345678",
      address: "123 Avenue de la République, 13001 Marseille",
      city: "Marseille",
      region: "PACA",
      lat: 43.2965,
      lng: 5.3698,
      isActive: true
    });
    console.log("✅ Centre créé:", centre.name);

    // Create centre user (partner login)
    const centreUser = await CentreUser.create({
      centreId: centre._id,
      email: "partenaire@lavagepromarseille.fr",
      password: "partenaire123",
      name: "Gérant Lavage Pro",
      isActive: true
    });
    console.log("✅ Utilisateur centre créé:", centreUser.email);

    // Create prestations
    const prestation1 = await Prestation.create({
      centreId: centre._id,
      nom: "Lavage Intérieur",
      description: "Nettoyage complet de l'intérieur du véhicule",
      duree: 30,
      prix: 49,
      isActive: true
    });

    const prestation2 = await Prestation.create({
      centreId: centre._id,
      nom: "Complet Premium",
      description: "Lavage intérieur et extérieur avec cire",
      duree: 90,
      prix: 99,
      isActive: true
    });
    console.log("✅ Prestations créées");

    // Create calendar
    const calendar = await Calendar.create({
      centreId: centre._id,
      indispos: [],
      slots: {
        "2025-12-01": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
        "2025-12-02": ["09:00", "10:00", "14:00", "15:00"]
      },
      defaultHours: {
        start: "09:00",
        end: "18:00"
      },
      defaultDuration: 30
    });
    console.log("✅ Calendrier créé");

    console.log("\n🎉 Données seed créées avec succès!");
    console.log("\n📋 Identifiants de connexion:");
    console.log("   Admin - Email: admin@leadclean.com / Password: admin123");
    console.log("   Closeur - Email: closeur@leadclean.com / Password: closeur123");
    console.log("   Partenaire - Email: partenaire@lavagepromarseille.fr / Password: partenaire123");
    console.log(`\n🔗 Centre ID: ${centre._id}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  }
};

seedData();
