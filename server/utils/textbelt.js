const axios = require("axios");

const sendSMS = async (phone, message) => {
  try {
    const apiKey = process.env.TEXTBELT_API_KEY;
    
    if (!apiKey) {
      console.warn("⚠️ TEXTBELT_API_KEY non configurée");
      return { success: false, message: "API key manquante" };
    }

    // Format phone number (remove spaces, ensure + prefix for international)
    let formattedPhone = phone.replace(/\s+/g, "");
    if (!formattedPhone.startsWith("+")) {
      // If starts with 0, replace with +33 (France)
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "+33" + formattedPhone.substring(1);
      } else if (formattedPhone.startsWith("33")) {
        formattedPhone = "+" + formattedPhone;
      } else {
        formattedPhone = "+33" + formattedPhone;
      }
    }

    console.log(`📤 Envoi SMS à ${formattedPhone}...`);

    const response = await axios.post("https://textbelt.com/text", {
      phone: formattedPhone,
      message: message,
      key: apiKey
    });

    console.log("📥 Réponse TextBelt:", response.data);

    // TextBelt peut retourner success: false même avec status 200
    if (response.data && response.data.success === false) {
      return { 
        success: false, 
        message: response.data.message || "Erreur TextBelt",
        error: response.data.error || response.data.message
      };
    }

    return response.data;
  } catch (error) {
    console.error("❌ Erreur envoi SMS:", error.response?.data || error.message);
    return { 
      success: false, 
      error: error.message,
      details: error.response?.data || "Erreur inconnue"
    };
  }
};

const sendConfirmationSMS = (rdv, centre) => {
  const date = new Date(rdv.date);
  const dateStr = date.toLocaleDateString("fr-FR", { 
    weekday: "long", 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  });
  
  const message = `Bonjour ${rdv.client.prenom}, votre RDV chez ${centre.name} est confirmé pour le ${dateStr} à ${rdv.heure}.`;
  
  return sendSMS(rdv.client.telephone, message);
};

const sendAfterServiceSMS = (rdv, centre, photoToken) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const photoUrl = `${frontendUrl}/rdv/${rdv._id}/photos?token=${photoToken}`;
  
  // Message optimisé pour SMS avec lien vers la page de l'app
  const message = `Merci ${rdv.client.prenom} ! Votre véhicule est prêt. 📸 Voir vos photos : ${photoUrl} Laissez un avis Google pour déverrouiller l'accès.`;
  
  console.log(`📝 Message SMS (${message.length} caractères):`, message);
  console.log(`🔗 Lien photos: ${photoUrl}`);
  
  return sendSMS(rdv.client.telephone, message);
};

const sendCentreNotificationSMS = (rdv, centre) => {
  const date = new Date(rdv.date);
  const dateStr = date.toLocaleDateString("fr-FR", { 
    weekday: "long", 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  });
  
  const message = `📅 Nouveau RDV : ${rdv.client.prenom} ${rdv.client.nom} – ${rdv.prestationId?.nom || 'Prestation'} le ${dateStr} à ${rdv.heure}. Tél: ${rdv.client.telephone}`;
  
  console.log(`📤 Envoi SMS au centre ${centre.name}...`);
  
  if (!centre.phone) {
    console.warn(`⚠️ Centre ${centre.name} n'a pas de numéro de téléphone`);
    return { success: false, message: "Centre sans numéro de téléphone" };
  }
  
  return sendSMS(centre.phone, message);
};

module.exports = {
  sendSMS,
  sendConfirmationSMS,
  sendAfterServiceSMS,
  sendCentreNotificationSMS
};

