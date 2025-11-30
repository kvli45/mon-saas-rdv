import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin.js';
import Centre from '../models/Centre.js';
import Prestation from '../models/Prestation.js';
import Calendar from '../models/Calendar.js';

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://admin:password@localhost:27017/leadclean?authSource=admin');
    console.log('✅ Connecté à MongoDB');

    // Clear existing data
    await Admin.deleteMany({});
    await Centre.deleteMany({});
    await Prestation.deleteMany({});
    await Calendar.deleteMany({});

    // Create admin
    const admin = await Admin.create({
      email: 'admin@leadclean.com',
      password: 'admin123',
      name: 'Admin Principal',
      role: 'admin'
    });
    console.log('✅ Admin créé:', admin.email);

    // Create centre
    const centre = await Centre.create({
      name: 'Lavage Pro Marseille',
      logoUrl: '/images/centre1.png',
      googleMapsLink: 'https://maps.google.com/?q=Lavage+Pro+Marseille',
      googleReviewLink: 'https://g.page/centre-lavage-pro',
      email: 'contact@lavagepromarseille.fr',
      phone: '+33612345678',
      address: '123 Avenue de la République, 13001 Marseille',
      isActive: true
    });
    console.log('✅ Centre créé:', centre.name);

    // Create prestations
    const prestation1 = await Prestation.create({
      centreId: centre._id,
      nom: 'Lavage Intérieur',
      description: 'Nettoyage complet de l\'intérieur du véhicule',
      duree: 30,
      prix: 49,
      isActive: true
    });

    const prestation2 = await Prestation.create({
      centreId: centre._id,
      nom: 'Complet Premium',
      description: 'Lavage intérieur et extérieur avec cire',
      duree: 90,
      prix: 99,
      isActive: true
    });
    console.log('✅ Prestations créées');

    // Create calendar
    const calendar = await Calendar.create({
      centreId: centre._id,
      indispos: [],
      slots: {
        '2025-12-01': ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
        '2025-12-02': ['09:00', '10:00', '14:00', '15:00']
      },
      defaultHours: {
        start: '09:00',
        end: '18:00'
      },
      defaultDuration: 30
    });
    console.log('✅ Calendrier créé');

    console.log('\n🎉 Données seed créées avec succès!');
    console.log('\n📋 Identifiants de connexion:');
    console.log('   Email: admin@leadclean.com');
    console.log('   Password: admin123');
    console.log(`\n🔗 Centre ID: ${centre._id}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

seedData();

