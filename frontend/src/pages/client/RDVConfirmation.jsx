import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import { format } from 'date-fns';

export default function RDVConfirmation() {
  const { rdvId } = useParams();
  const [rdv, setRdv] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRDV();
  }, [rdvId]);

  const fetchRDV = async () => {
    try {
      const { data } = await api.get(`/rdv/${rdvId}`);
      setRdv(data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (!rdv) {
    return <div className="min-h-screen flex items-center justify-center">Rendez-vous non trouvé</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
      >
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Réservation confirmée !</h1>
          <p className="text-gray-600">Vous allez recevoir un SMS de confirmation</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
          <h2 className="font-semibold text-lg mb-4">Détails du rendez-vous</h2>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Centre:</span> {rdv.centreId?.name}</p>
            <p><span className="font-medium">Prestation:</span> {rdv.prestationId?.nom}</p>
            <p><span className="font-medium">Date:</span> {format(new Date(rdv.date), 'dd/MM/yyyy')} à {rdv.heure}</p>
            <p><span className="font-medium">Prix:</span> {rdv.prestationId?.prix}€</p>
            <p><span className="font-medium">Client:</span> {rdv.client.prenom} {rdv.client.nom}</p>
            <p><span className="font-medium">Téléphone:</span> {rdv.client.telephone}</p>
            {rdv.client.vehicule && (
              <p><span className="font-medium">Véhicule:</span> {rdv.client.vehicule}</p>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-500">
          <p>Un SMS de confirmation vous a été envoyé.</p>
          <p className="mt-2">À bientôt !</p>
        </div>
      </motion.div>
    </div>
  );
}

