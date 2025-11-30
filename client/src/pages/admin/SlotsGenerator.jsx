import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../../services/api";

export default function SlotsGenerator() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    startTime: "09:00",
    endTime: "17:00",
    duration: 60,
    daysOfWeek: [] // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const daysLabels = [
    { value: 0, label: "Dimanche" },
    { value: 1, label: "Lundi" },
    { value: 2, label: "Mardi" },
    { value: 3, label: "Mercredi" },
    { value: 4, label: "Jeudi" },
    { value: 5, label: "Vendredi" },
    { value: 6, label: "Samedi" }
  ];

  const handleDayToggle = (day) => {
    setForm(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort()
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const response = await api.post("/rdv/slots/generate", {
        centreId: id,
        startTime: form.startTime,
        endTime: form.endTime,
        duration: form.duration,
        daysOfWeek: form.daysOfWeek.length > 0 ? form.daysOfWeek : undefined
      });

      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la génération");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <motion.button
              onClick={() => navigate(`/admin/centres/${id}`)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mr-4 text-gray-600 hover:text-gray-900 flex items-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour
            </motion.button>
            <h1 className="text-2xl font-bold text-gray-900">Génération automatique de créneaux</h1>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="w-1 h-8 rounded" style={{ backgroundColor: '#1D4ED8' }}></span>
            Configuration
          </h2>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-6"
            >
              <p className="font-medium">{error}</p>
            </motion.div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded mb-6"
            >
              <p className="font-bold mb-2">✅ Génération réussie !</p>
              <p className="text-sm">
                {result.generated} créneau{result.generated > 1 ? "x" : ""} généré{result.generated > 1 ? "s" : ""} pour les 30 prochains jours
              </p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Time Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Heure de début *
                </label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Heure de fin *
                </label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  required
                  className="input-field"
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Durée d'un créneau (minutes) *
              </label>
              <input
                type="number"
                min="15"
                step="15"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 60 })}
                required
                className="input-field"
                placeholder="60"
              />
              <p className="text-xs text-gray-500 mt-1">
                Durée recommandée : 30, 45, 60 ou 90 minutes
              </p>
            </div>

            {/* Days of Week */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Jours de la semaine (optionnel)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Si aucun jour n'est sélectionné, les créneaux seront générés pour tous les jours
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {daysLabels.map((day) => (
                  <motion.button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                      form.daysOfWeek.includes(day.value)
                        ? "text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    style={form.daysOfWeek.includes(day.value) ? { backgroundColor: '#1D4ED8' } : {}}
                  >
                    {day.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-2">💡 Information</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Les créneaux seront générés pour les 30 prochains jours</li>
                <li>Les créneaux existants ne seront pas dupliqués</li>
                <li>Vous pouvez générer plusieurs fois pour ajouter des créneaux supplémentaires</li>
              </ul>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full btn-primary text-lg py-4"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Génération en cours...
                </span>
              ) : (
                "🚀 Générer les créneaux"
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

