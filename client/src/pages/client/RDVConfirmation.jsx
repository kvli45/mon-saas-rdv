import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { format } from 'date-fns';

export default function RDVConfirmation() {
  const { id } = useParams();
  const [rdv, setRdv] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRDV();
  }, [id]);

  const fetchRDV = async () => {
    try {
      const { data } = await api.get(`/rdv/${id}`);
      setRdv(data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!rdv) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <p className="text-red-600 font-semibold">Rendez-vous non trouvé</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10 max-w-lg w-full"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 }}
              className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white"
            />
          </div>
        </motion.div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Réservation confirmée !
          </h1>
          <p className="text-gray-600 text-lg">
            Vous allez recevoir un SMS de confirmation
          </p>
        </div>

        {/* Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6 border border-gray-200"
        >
          <h2 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-primary-500 rounded"></span>
            Détails du rendez-vous
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
              <span className="text-gray-600 font-medium">Centre:</span>
              <span className="text-gray-900 font-semibold">{rdv.centreId?.name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
              <span className="text-gray-600 font-medium">Prestation:</span>
              <span className="text-gray-900 font-semibold">{rdv.prestationId?.nom}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
              <span className="text-gray-600 font-medium">Date:</span>
              <span className="text-gray-900 font-semibold">{format(new Date(rdv.date), 'dd/MM/yyyy')} à {rdv.heure}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
              <span className="text-gray-600 font-medium">Prix:</span>
              <span className="text-gray-900 font-semibold text-lg">{rdv.prestationId?.prix}€</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
              <span className="text-gray-600 font-medium">Client:</span>
              <span className="text-gray-900 font-semibold">{rdv.client.prenom} {rdv.client.nom}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
              <span className="text-gray-600 font-medium">Téléphone:</span>
              <span className="text-gray-900 font-semibold">{rdv.client.telephone}</span>
            </div>
            {rdv.client.vehicule && (
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 font-medium">Véhicule:</span>
                <span className="text-gray-900 font-semibold">{rdv.client.vehicule}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Footer Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 text-gray-600 mb-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">SMS de confirmation envoyé</span>
          </div>
          <p className="text-gray-500 text-sm">À bientôt !</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
