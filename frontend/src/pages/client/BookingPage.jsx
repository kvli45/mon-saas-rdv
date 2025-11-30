import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import api from '../../utils/api';
import { format } from 'date-fns';

export default function BookingPage() {
  const { centreId } = useParams();
  const navigate = useNavigate();
  const [centre, setCentre] = useState(null);
  const [prestations, setPrestations] = useState([]);
  const [selectedPrestation, setSelectedPrestation] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [client, setClient] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    vehicule: ''
  });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCentre();
  }, [centreId]);

  useEffect(() => {
    if (selectedPrestation && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedPrestation, selectedDate, centreId]);

  const fetchCentre = async () => {
    try {
      const [centreRes, prestationsRes] = await Promise.all([
        api.get(`/centres/${centreId}`),
        api.get(`/prestations/centre/${centreId}`)
      ]);
      setCentre(centreRes.data);
      setPrestations(prestationsRes.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedPrestation) return;
    
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data } = await api.get(`/calendar/${centreId}/available`, {
        params: {
          date: dateStr,
          duration: selectedPrestation.duree
        }
      });
      setAvailableSlots(data.slots || []);
    } catch (error) {
      console.error('Erreur:', error);
      setAvailableSlots([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data } = await api.post('/rdv', {
        centreId,
        prestationId: selectedPrestation._id,
        date: dateStr,
        heure: selectedSlot,
        client
      });
      
      navigate(`/rdv/${data._id}/confirmation`);
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de la réservation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (!centre) {
    return <div className="min-h-screen flex items-center justify-center">Centre non trouvé</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{centre.name}</h1>
            <p className="text-gray-600">Réservez votre rendez-vous</p>
          </div>

          {/* Step 1: Select Prestation */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-semibold mb-6">Choisissez une prestation</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prestations.map((prestation) => (
                  <motion.div
                    key={prestation._id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => {
                      setSelectedPrestation(prestation);
                      setStep(2);
                    }}
                    className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                      selectedPrestation?._id === prestation._id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <h3 className="text-xl font-semibold mb-2">{prestation.nom}</h3>
                    <p className="text-gray-600 text-sm mb-4">{prestation.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Durée: {prestation.duree} min</span>
                      <span className="text-2xl font-bold text-indigo-600">{prestation.prix}€</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Select Date & Time */}
          {step === 2 && selectedPrestation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Choisissez date et heure</h2>
                <button
                  onClick={() => {
                    setStep(1);
                    setSelectedPrestation(null);
                  }}
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  ← Changer de prestation
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Sélectionnez une date</h3>
                  <Calendar
                    onChange={setSelectedDate}
                    value={selectedDate}
                    minDate={new Date()}
                    className="mx-auto"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-4">Créneaux disponibles</h3>
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className={`px-4 py-2 rounded-lg border-2 transition-all ${
                            selectedSlot === slot
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 hover:border-indigo-300'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">Aucun créneau disponible pour cette date</p>
                  )}
                </div>
              </div>

              {selectedSlot && (
                <button
                  onClick={() => setStep(3)}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Continuer
                </button>
              )}
            </motion.div>
          )}

          {/* Step 3: Client Info */}
          {step === 3 && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Vos informations</h2>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  ← Retour
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={client.prenom}
                    onChange={(e) => setClient({ ...client, prenom: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={client.nom}
                    onChange={(e) => setClient({ ...client, nom: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={client.email}
                    onChange={(e) => setClient({ ...client, email: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    value={client.telephone}
                    onChange={(e) => setClient({ ...client, telephone: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Véhicule
                  </label>
                  <input
                    type="text"
                    value={client.vehicule}
                    onChange={(e) => setClient({ ...client, vehicule: e.target.value })}
                    placeholder="Ex: Peugeot 208"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-2">Récapitulatif</h3>
                <p className="text-sm text-gray-600">
                  {selectedPrestation?.nom} - {selectedPrestation?.prix}€
                </p>
                <p className="text-sm text-gray-600">
                  {format(selectedDate, 'dd/MM/yyyy')} à {selectedSlot}
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Réservation en cours...' : 'Confirmer la réservation'}
              </button>
            </motion.form>
          )}
        </motion.div>
      </div>
    </div>
  );
}

