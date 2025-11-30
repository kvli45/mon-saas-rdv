import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../../services/api";

export default function Calendar({ centreId }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [slots, setSlots] = useState([]);
  const [newSlot, setNewSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSlots = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/rdv/slots/${centreId}`, {
        params: { date: selectedDate },
      });
      setSlots(res.data);
    } catch (error) {
      console.error("Erreur:", error);
      setError("Erreur lors du chargement des créneaux");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (centreId && selectedDate) {
      fetchSlots();
    }
  }, [selectedDate, centreId]);

  const addSlot = async () => {
    if (!newSlot) {
      setError("Veuillez sélectionner une heure");
      return;
    }

    setError("");
    try {
      await api.post("/rdv/slots", {
        centreId,
        date: selectedDate,
        hour: newSlot,
      });
      setNewSlot("");
      fetchSlots();
    } catch (error) {
      setError(
        error.response?.data?.message || "Erreur lors de l'ajout du créneau"
      );
    }
  };

  const deleteSlot = async (hour) => {
    if (!window.confirm(`Supprimer le créneau ${hour} ?`)) return;

    try {
      await api.delete("/rdv/slots", {
        data: { centreId, date: selectedDate, hour },
      });
      fetchSlots();
    } catch (error) {
      setError(
        error.response?.data?.message || "Erreur lors de la suppression"
      );
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-5">
      {error && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded text-sm"
        >
          {error}
        </motion.div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Sélectionner une date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="input-field"
          />
        </div>
        {selectedDate && (
          <div className="text-sm font-medium text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
            {formatDate(selectedDate)}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-end gap-3 border-t pt-5">
        <div className="flex-1 w-full">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Heure du créneau
          </label>
          <input
            type="time"
            value={newSlot}
            onChange={(e) => setNewSlot(e.target.value)}
            className="input-field"
          />
        </div>
        <motion.button
          onClick={addSlot}
          disabled={loading || !newSlot}
          whileHover={{ scale: loading || !newSlot ? 1 : 1.05 }}
          whileTap={{ scale: loading || !newSlot ? 1 : 0.95 }}
          className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg whitespace-nowrap"
        >
          {loading ? "..." : "+ Ajouter"}
        </motion.button>
      </div>

      <div className="border-t pt-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          Créneaux disponibles ({slots.length})
        </h3>
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 py-8">
            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Chargement...</span>
          </div>
        ) : slots.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-gray-600 text-sm font-medium">Aucun créneau pour ce jour.</p>
            <p className="text-gray-500 text-xs mt-1">Ajoutez-en un ci-dessus.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {slots.map((hour, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg hover:shadow-md transition-all border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1D4ED8' }}>
                    <span className="text-white font-bold text-sm">{hour}</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {new Date(`${selectedDate}T${hour}`).toLocaleTimeString(
                      "fr-FR",
                      { hour: "2-digit", minute: "2-digit" }
                    )}
                  </span>
                </div>
                <motion.button
                  onClick={() => deleteSlot(hour)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="text-red-500 hover:text-red-700 px-3 py-1.5 text-sm font-semibold hover:bg-red-50 rounded-lg transition-colors"
                >
                  Supprimer
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">💡 Astuce</p>
        <p className="text-blue-700">
          Les créneaux ajoutés ici seront disponibles pour les réservations clients.
        </p>
      </div>
    </div>
  );
}
