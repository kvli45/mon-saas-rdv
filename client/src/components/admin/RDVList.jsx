import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../../services/api";
import dayjs from "dayjs";
import "dayjs/locale/fr";

dayjs.locale("fr");

export default function RDVList({ centreId }) {
  const [rdvs, setRdvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("upcoming");
  const [sendingSMS, setSendingSMS] = useState(null);
  const navigate = useNavigate();

  const fetchRDV = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/rdv/by-centre/${centreId}`);
      setRdvs(res.data);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (centreId) {
      fetchRDV();
    }
  }, [centreId]);

  const sendConfirmation = async (rdvId) => {
    if (!window.confirm("Envoyer le SMS de confirmation au client ?")) return;

    setSendingSMS(rdvId);
    try {
      await api.post(`/rdv/send-confirmation/${rdvId}`);
      await fetchRDV();
      alert("📲 SMS envoyé avec succès !");
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de l'envoi du SMS");
    } finally {
      setSendingSMS(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "confirmed":
        return "Confirmé";
      case "pending":
        return "En attente";
      case "completed":
        return "Terminé";
      case "cancelled":
        return "Annulé";
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Date invalide";
    try {
      return dayjs(dateString).format("dddd DD MMMM YYYY");
    } catch (e) {
      return new Date(dateString).toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  };

  const today = dayjs().startOf("day");
  const filteredRDVs = rdvs.filter((rdv) => {
    if (!rdv.date) return false;
    const rdvDate = dayjs(rdv.date).startOf("day");
    if (filter === "upcoming") {
      return (rdvDate.isAfter(today) || rdvDate.isSame(today)) && rdv.status !== "cancelled";
    } else if (filter === "past") {
      return rdvDate.isBefore(today) && rdv.status !== "cancelled";
    } else if (filter === "completed") {
      return rdv.status === "completed";
    }
    return true;
  }).sort((a, b) => {
    if (!a.date || !b.date) return 0;
    const dateA = dayjs(`${a.date} ${a.heure || "00:00"}`);
    const dateB = dayjs(`${b.date} ${b.heure || "00:00"}`);
    return dateA.diff(dateB);
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Chargement des rendez-vous...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "upcoming", label: "À venir" },
          { key: "all", label: "Tous" },
          { key: "past", label: "Passés" },
          { key: "completed", label: "Terminés" },
        ].map((f) => (
          <motion.button
            key={f.key}
            onClick={() => setFilter(f.key)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filter === f.key
                ? "text-white shadow-md"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            style={filter === f.key ? { backgroundColor: '#1D4ED8' } : {}}
          >
            {f.label}
          </motion.button>
        ))}
      </div>

      {filteredRDVs.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <div className="text-5xl mb-4">📅</div>
          <p className="text-gray-600 font-medium text-lg">
            Aucun rendez-vous {filter !== "all" ? "pour ce filtre" : ""}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRDVs.map((rdv, index) => (
            <motion.div
              key={rdv._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card hover:shadow-xl transition-all duration-300"
            >
              <div className="flex flex-col lg:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-bold text-gray-900">
                      {rdv.client?.prenom} {rdv.client?.nom}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(
                        rdv.status
                      )}`}
                    >
                      {getStatusLabel(rdv.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <span className="text-lg">📅</span>
                      <span className="font-medium">
                        {formatDate(rdv.date)} à {rdv.heure}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <span className="text-lg">🧾</span>
                      <span className="font-medium">
                        {rdv.prestationId?.nom || "Prestation"} - {rdv.prestationId?.prix || 0}€
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <span className="text-lg">📞</span>
                      <span className="font-medium">{rdv.client?.telephone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <span className="text-lg">✉️</span>
                      <span className="font-medium">{rdv.client?.email}</span>
                    </div>
                    {rdv.client?.vehicule && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <span className="text-lg">🚗</span>
                        <span className="font-medium">{rdv.client.vehicule}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {rdv.smsSent?.confirmation && (
                      <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-semibold border border-green-200">
                        ✓ SMS Confirmé
                      </span>
                    )}
                    {rdv.smsSent?.afterService && (
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold border border-blue-200">
                        ✓ SMS Photos Envoyé
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 lg:min-w-[200px]">
                  {rdv.status === "pending" && !rdv.smsSent?.confirmation && (
                    <motion.button
                      onClick={() => sendConfirmation(rdv._id)}
                      disabled={sendingSMS === rdv._id}
                      whileHover={{ scale: sendingSMS === rdv._id ? 1 : 1.05 }}
                      whileTap={{ scale: sendingSMS === rdv._id ? 1 : 0.95 }}
                      className="bg-blue-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                    >
                      {sendingSMS === rdv._id ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Envoi...
                        </span>
                      ) : (
                        "📲 Envoyer SMS"
                      )}
                    </motion.button>
                  )}

                  <motion.button
                    onClick={() =>
                      navigate(
                        `/admin/centres/${centreId}/rdv/${rdv._id}/photos`
                      )
                    }
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-900 transition-colors shadow-md hover:shadow-lg"
                  >
                    📸 Upload Photos
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="text-sm text-gray-500 text-center pt-4 border-t">
        <p className="font-medium">
          Total: <span className="text-primary-600 font-bold">{filteredRDVs.length}</span> rendez-vous
          {filter !== "all" && (
            <span className="text-gray-400"> ({rdvs.length} au total)</span>
          )}
        </p>
      </div>
    </div>
  );
}
