import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../../services/api";
import { format } from "date-fns";
import dayjs from "dayjs";
import "dayjs/locale/fr";

dayjs.locale("fr");

export default function BookingPage() {
  const { centreId } = useParams();
  const navigate = useNavigate();
  const [centre, setCentre] = useState(null);
  const [prestations, setPrestations] = useState([]);
  const [availableDays, setAvailableDays] = useState([]);
  const [selectedDaySlots, setSelectedDaySlots] = useState([]);
  const [form, setForm] = useState({
    prestationId: "",
    date: "",
    hour: "",
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    vehicule: ""
  });
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1: prestation, 2: date, 3: créneau, 4: infos

  useEffect(() => {
    fetchData();
  }, [centreId]);

  useEffect(() => {
    if (form.prestationId) {
      fetchAvailableDays();
    } else {
      setAvailableDays([]);
    }
  }, [form.prestationId, centreId]);

  useEffect(() => {
    if (form.date && form.prestationId) {
      fetchSlotsForDate();
    } else {
      setSelectedDaySlots([]);
    }
  }, [form.date, form.prestationId, centreId]);

  const fetchData = async () => {
    try {
      const [centreRes, prestationsRes] = await Promise.all([
        api.get(`/centres/${centreId}`),
        api.get(`/prestations/centre/${centreId}`)
      ]);
      setCentre(centreRes.data);
      setPrestations(prestationsRes.data);
    } catch (error) {
      console.error("Erreur:", error);
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableDays = async () => {
    if (!form.prestationId) return;

    try {
      const prestation = prestations.find(p => p._id === form.prestationId);
      if (!prestation) return;

      // Fetch slots for next 30 days
      const days = Array.from({ length: 30 }, (_, i) => {
        const date = dayjs().add(i, "day");
        return date.format("YYYY-MM-DD");
      });

      const availabilityPromises = days.map(async (dateStr) => {
        try {
          const { data } = await api.get(`/calendar/${centreId}/available`, {
            params: {
              date: dateStr,
              duration: prestation.duree
            }
          });
          return {
            date: dateStr,
            hasSlots: data.slots && data.slots.length > 0,
            slotsCount: data.slots?.length || 0
          };
        } catch (error) {
          return {
            date: dateStr,
            hasSlots: false,
            slotsCount: 0
          };
        }
      });

      const results = await Promise.all(availabilityPromises);
      setAvailableDays(results);
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const fetchSlotsForDate = async () => {
    if (!form.date || !form.prestationId) return;

    setLoadingSlots(true);
    try {
      const prestation = prestations.find(p => p._id === form.prestationId);
      if (!prestation) return;

      const dateStr = form.date.split("T")[0];
      const { data } = await api.get(`/calendar/${centreId}/available`, {
        params: {
          date: dateStr,
          duration: prestation.duree
        }
      });
      setSelectedDaySlots(data.slots || []);
      setStep(3);
    } catch (error) {
      console.error("Erreur:", error);
      setSelectedDaySlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateClick = (dateStr) => {
    setForm({ ...form, date: dateStr, hour: "" });
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!form.prestationId || !form.date || !form.hour || !form.prenom || !form.nom || !form.email || !form.telephone) {
      setError("Veuillez remplir tous les champs obligatoires");
      setSubmitting(false);
      return;
    }

    try {
      const dateStr = form.date.split("T")[0];
      const { data } = await api.post("/rdv/book", {
        centreId,
        prestationId: form.prestationId,
        date: dateStr,
        hour: form.hour,
        client: {
          prenom: form.prenom,
          nom: form.nom,
          email: form.email,
          telephone: form.telephone,
          vehicule: form.vehicule || ""
        }
      });
      
      navigate(`/rdv/${data.rdvId || data._id}/confirmation`);
    } catch (error) {
      setError(error.response?.data?.message || "Erreur lors de la réservation");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPrestation = prestations.find(p => p._id === form.prestationId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#1D4ED8', borderTopColor: 'transparent' }}></div>
          <p className="text-gray-600 font-medium">Chargement...</p>
        </motion.div>
      </div>
    );
  }

  if (!centre) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <p className="text-red-600 font-semibold text-lg">Centre non trouvé</p>
        </div>
      </div>
    );
  }

  const today = dayjs().format("YYYY-MM-DD");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-8 px-4 sm:py-12">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="card shadow-xl"
        >
          {/* Header */}
          <div className="text-center mb-8 pb-6 border-b border-gray-200">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ backgroundColor: '#1D4ED8' }}
            >
              <span className="text-2xl">📅</span>
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{centre.name}</h1>
            <p className="text-gray-600">Réservez votre rendez-vous en quelques clics</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-6"
            >
              <p className="font-medium">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: Prestation */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                <span className="text-lg mr-2">1️⃣</span>
                Choisissez une prestation *
              </label>
              <select
                value={form.prestationId}
                onChange={(e) => {
                  setForm({ ...form, prestationId: e.target.value, date: "", hour: "" });
                  setStep(2);
                }}
                required
                className="input-field text-lg"
              >
                <option value="">-- Sélectionner une prestation --</option>
                {prestations.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.nom} – {p.duree} min – {p.prix}€
                  </option>
                ))}
              </select>
              {selectedPrestation && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg"
                >
                  <p className="text-sm text-gray-700 font-medium mb-1">
                    {selectedPrestation.description || "Aucune description"}
                  </p>
                  <p className="text-xs text-gray-600">
                    Durée: {selectedPrestation.duree} minutes • Prix: {selectedPrestation.prix}€
                  </p>
                </motion.div>
              )}
            </motion.div>

            {/* Step 2: Calendar - Date Selection */}
            {form.prestationId && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="border-t pt-6"
              >
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  <span className="text-lg mr-2">2️⃣</span>
                  Choisissez une date disponible *
                </label>

                {availableDays.length === 0 && form.prestationId && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-gray-600">Chargement des disponibilités...</p>
                  </div>
                )}

                {availableDays.length > 0 && (
                  <>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 mb-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
                        <span className="text-gray-700 font-medium">Disponible</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded"></div>
                        <span className="text-gray-700 font-medium">Complet</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-100 border-2 border-gray-400 rounded"></div>
                        <span className="text-gray-700 font-medium">Aujourd'hui</span>
                      </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {availableDays.map((day, index) => {
                        const dateObj = dayjs(day.date);
                        const isToday = day.date === today;
                        const isSelected = form.date === day.date;
                        const isPast = dayjs(day.date).isBefore(dayjs(), "day");

                        return (
                          <motion.button
                            key={day.date}
                            type="button"
                            onClick={() => !isPast && day.hasSlots && handleDateClick(day.date)}
                            disabled={isPast || !day.hasSlots}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className={`p-4 rounded-xl shadow-md text-center font-medium transition-all hover:shadow-lg ${
                              isPast
                                ? "bg-gray-100 border-2 border-gray-300 text-gray-400 cursor-not-allowed"
                                : day.hasSlots
                                ? isSelected
                                  ? "bg-blue-500 border-2 border-blue-700 text-white shadow-lg scale-105"
                                  : "bg-green-50 border-2 border-green-500 text-green-800 hover:bg-green-100 cursor-pointer"
                                : "bg-red-50 border-2 border-red-500 text-red-800 cursor-not-allowed"
                            } ${isToday ? "ring-2 ring-yellow-400" : ""}`}
                          >
                            <p className="text-xs text-gray-500 mb-1">
                              {dateObj.format("ddd")}
                            </p>
                            <p className="text-xl font-bold mb-1">
                              {dateObj.format("DD")}
                            </p>
                            <p className="text-xs mb-2">
                              {dateObj.format("MMM")}
                            </p>
                            {day.hasSlots && !isPast && (
                              <p className="text-xs font-semibold">
                                🟢 {day.slotsCount} créneau{day.slotsCount > 1 ? "x" : ""}
                              </p>
                            )}
                            {!day.hasSlots && !isPast && (
                              <p className="text-xs font-semibold">🔴 Complet</p>
                            )}
                            {isPast && (
                              <p className="text-xs font-semibold">Passé</p>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Step 3: Time Slot Selection */}
            {form.date && form.prestationId && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="border-t pt-6"
              >
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <span className="text-lg mr-2">3️⃣</span>
                  Choisissez un créneau horaire *
                </label>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-gray-500 py-8">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Chargement des créneaux...</span>
                  </div>
                ) : selectedDaySlots.length === 0 ? (
                  <p className="text-gray-500 text-sm bg-gray-50 p-4 rounded-lg">
                    Aucun créneau disponible pour cette date. Veuillez choisir une autre date.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {selectedDaySlots.map((slot, i) => (
                      <motion.button
                        key={i}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, hour: slot });
                          setStep(4);
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`p-4 rounded-lg font-semibold text-center transition-all ${
                          form.hour === slot
                            ? "bg-blue-600 text-white shadow-lg"
                            : "bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-500 hover:bg-blue-50"
                        }`}
                      >
                        {slot}
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Client Info */}
            {form.prestationId && form.date && form.hour && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="border-t pt-6"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-lg mr-2">4️⃣</span>
                  <span className="w-1 h-6 rounded" style={{ backgroundColor: '#1D4ED8' }}></span>
                  Vos informations
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      value={form.prenom}
                      onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                      required
                      className="input-field"
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nom *
                    </label>
                    <input
                      type="text"
                      value={form.nom}
                      onChange={(e) => setForm({ ...form, nom: e.target.value })}
                      required
                      className="input-field"
                      placeholder="Dupont"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                      className="input-field"
                      placeholder="jean.dupont@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      value={form.telephone}
                      onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                      required
                      className="input-field"
                      placeholder="+33612345678"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Véhicule (optionnel)
                    </label>
                    <input
                      type="text"
                      value={form.vehicule}
                      onChange={(e) => setForm({ ...form, vehicule: e.target.value })}
                      className="input-field"
                      placeholder="Ex: Peugeot 208"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Récapitulatif */}
            {form.prestationId && form.date && form.hour && selectedPrestation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6"
              >
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                  <span>📋</span>
                  Récapitulatif de votre réservation
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center bg-white p-3 rounded-lg">
                    <span className="text-gray-700 font-medium">Prestation:</span>
                    <span className="text-gray-900 font-bold">{selectedPrestation.nom}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-3 rounded-lg">
                    <span className="text-gray-700 font-medium">Date et heure:</span>
                    <span className="text-gray-900 font-bold">
                      {dayjs(form.date).format("dddd DD MMMM YYYY")} à {form.hour}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-3 rounded-lg">
                    <span className="text-gray-700 font-medium">Durée:</span>
                    <span className="text-gray-900 font-bold">{selectedPrestation.duree} minutes</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-3 rounded-lg border-2 border-blue-500">
                    <span className="text-gray-700 font-medium">Prix:</span>
                    <span className="text-blue-600 font-bold text-lg">{selectedPrestation.prix}€</span>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={submitting || !form.prestationId || !form.date || !form.hour}
              whileHover={{ scale: submitting ? 1 : 1.02 }}
              whileTap={{ scale: submitting ? 1 : 0.98 }}
              className="w-full btn-primary text-lg py-4"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Réservation en cours...
                </span>
              ) : (
                "✅ Valider le rendez-vous"
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
