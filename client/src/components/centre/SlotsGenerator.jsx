import { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export default function SlotsGenerator({ onGenerate }) {
  const [form, setForm] = useState({
    startTime: "09:00",
    endTime: "17:00",
    duration: 60,
    daysOfWeek: []
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
      const token = localStorage.getItem("centreToken");
      const response = await axios.post(
        `${API_URL}/centre/slots/generate`,
        {
          startTime: form.startTime,
          endTime: form.endTime,
          duration: form.duration,
          daysOfWeek: form.daysOfWeek.length > 0 ? form.daysOfWeek : undefined
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setResult(response.data);
      if (onGenerate) {
        onGenerate();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la génération");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded"
        >
          <p className="font-medium text-sm">{error}</p>
        </motion.div>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded"
        >
          <p className="font-bold mb-2">✅ Génération réussie !</p>
          <p className="text-sm">
            {result.generated} créneau{result.generated > 1 ? "x" : ""} généré{result.generated > 1 ? "s" : ""} pour les 30 prochains jours
          </p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-semibold mb-2">💡 Information</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li>Les créneaux seront générés pour les 30 prochains jours</li>
            <li>Les créneaux existants ne seront pas dupliqués</li>
            <li>Vous pouvez générer plusieurs fois pour ajouter des créneaux supplémentaires</li>
          </ul>
        </div>

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
            "🧠 Générer 30 jours de créneaux"
          )}
        </motion.button>
      </form>
    </div>
  );
}

