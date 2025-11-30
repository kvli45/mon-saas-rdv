import axios from 'axios';

export const sendSMS = async (phone, message) => {
  try {
    const apiKey = process.env.TEXTBELT_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️ TEXTBELT_API_KEY non configurée');
      return { success: false, message: 'API key manquante' };
    }

    const response = await axios.post('https://textbelt.com/text', {
      phone: phone,
      message: message,
      key: apiKey
    });

    return response.data;
  } catch (error) {
    console.error('Erreur envoi SMS:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

export const sendConfirmationSMS = (rdv, centre) => {
  const date = new Date(rdv.date);
  const dateStr = date.toLocaleDateString('fr-FR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const message = `Bonjour ${rdv.client.prenom}, votre RDV chez ${centre.name} est confirmé pour le ${dateStr} à ${rdv.heure}.`;
  
  return sendSMS(rdv.client.telephone, message);
};

export const sendAfterServiceSMS = (rdv, centre, photoToken) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const photoUrl = `${frontendUrl}/rdv/${rdv._id}/photos?token=${photoToken}`;
  
  const message = `Merci ${rdv.client.prenom} ! Votre véhicule est prêt. Laissez-nous un avis Google pour accéder aux photos : ${centre.googleReviewLink}`;
  
  return sendSMS(rdv.client.telephone, message);
};

