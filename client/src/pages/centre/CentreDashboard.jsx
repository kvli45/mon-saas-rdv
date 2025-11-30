import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import SlotsGenerator from "../../components/centre/SlotsGenerator";

dayjs.locale("fr");

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export default function CentreDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [rdvs, setRdvs] = useState([]);
  const [slots, setSlots] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("upcoming");
  const [showSlots, setShowSlots] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("centreToken");
    if (!token) {
      navigate("/centre/login");
      return;
    }

    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("centreToken");
      const userData = JSON.parse(localStorage.getItem("centreUser") || "{}");
      setUser(userData);

      const [rdvsRes, slotsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/centre/rdvs`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/centre/slots`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/centre/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setRdvs(rdvsRes.data || []);
      setSlots(slotsRes.data || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Erreur:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("centreToken");
        localStorage.removeItem("centreUser");
        navigate("/centre/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("centreToken");
    localStorage.removeItem("centreUser");
    navigate("/centre/login");
  };

  const updateStatus = async (rdvId, status) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir ${status === "completed" ? "marquer ce RDV comme réalisé" : "annuler ce RDV"} ?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("centreToken");
      await axios.patch(
        `${API_URL}/centre/rdv/${rdvId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchData();
    } catch (error) {
      alert("Erreur lors de la mise à jour");
      console.error(error);
    }
  };

  const deleteSlot = async (slotId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce créneau ?")) {
      return;
    }

    try {
      const token = localStorage.getItem("centreToken");
      await axios.delete(`${API_URL}/centre/slot/${slotId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchData();
    } catch (error) {
      alert("Erreur lors de la suppression");
      console.error(error);
    }
  };

  const confirmRDV = async (rdvId) => {
    if (!window.confirm("Confirmer ce RDV et envoyer le SMS de confirmation au client ?")) {
      return;
    }

    try {
      const token = localStorage.getItem("centreToken");
      const res = await axios.post(
        `${API_URL}/centre/rdv/${rdvId}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ RDV confirmé et SMS envoyé avec succès !");
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Erreur lors de la confirmation");
      console.error(error);
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
    } else if (filter === "cancelled") {
      return rdv.status === "cancelled";
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#1D4ED8', borderTopColor: 'transparent' }}></div>
          <p className="text-gray-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1D4ED8' }}>
                <span className="text-white font-bold">LC</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🎛️ Tableau de bord</h1>
                <p className="text-sm text-gray-600">{user?.centreName}</p>
              </div>
            </div>
            <motion.button
              onClick={handleLogout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Déconnexion
            </motion.button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">À venir</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.upcomingCount || 0}</p>
                  <p className="text-sm text-gray-600 mt-1">RDV</p>
                </div>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">📅</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Ce mois</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.monthCount || 0}</p>
                  <p className="text-sm text-gray-600 mt-1">RDV</p>
                </div>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">📊</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Terminés</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.completedCount || 0}</p>
                  <p className="text-sm text-gray-600 mt-1">RDV</p>
                </div>
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">✅</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Revenu</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.revenue || 0}€</p>
                  <p className="text-sm text-gray-600 mt-1">Ce mois</p>
                </div>
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">💶</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Quick Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card mb-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{filteredRDVs.length}</p>
                <p className="text-sm text-gray-600">RDV {filter === "upcoming" ? "à venir" : filter === "past" ? "passés" : filter === "completed" ? "terminés" : "annulés"}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{slots.length}</p>
                <p className="text-sm text-gray-600">Créneaux disponibles</p>
              </div>
            </div>
            <motion.button
              onClick={() => setShowSlots(!showSlots)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-all"
              style={{ backgroundColor: showSlots ? '#1D4ED8' : '#6B7280', color: 'white' }}
            >
              {showSlots ? "Masquer" : "Afficher"} les créneaux
            </motion.button>
          </div>
        </motion.div>

        {/* Slots Generator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="w-1 h-8 rounded" style={{ backgroundColor: '#1D4ED8' }}></span>
            ⚡ Générateur de créneaux automatique
          </h2>
          <SlotsGenerator onGenerate={fetchData} />
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: "upcoming", label: "À venir", icon: "📅" },
            { key: "all", label: "Tous", icon: "📋" },
            { key: "past", label: "Passés", icon: "📜" },
            { key: "completed", label: "Terminés", icon: "✅" },
            { key: "cancelled", label: "Annulés", icon: "❌" },
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
              <span className="mr-2">{f.icon}</span>
              {f.label}
            </motion.button>
          ))}
        </div>

        {/* Slots Section */}
        {showSlots && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <span className="w-1 h-8 rounded" style={{ backgroundColor: '#1D4ED8' }}></span>
              🕐 Créneaux disponibles ({slots.length})
            </h2>
            {slots.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600 font-medium">Aucun créneau disponible</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {slots.map((slot, index) => (
                  <motion.div
                    key={slot._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900">
                          {dayjs(slot.date).format("DD MMM YYYY")}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">à {slot.hour}</p>
                      </div>
                      <motion.button
                        onClick={() => deleteSlot(slot._id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors shadow-sm"
                      >
                        ❌
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* RDV List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="w-1 h-8 rounded" style={{ backgroundColor: '#1D4ED8' }}></span>
            📋 Mes rendez-vous ({filteredRDVs.length})
          </h2>

          {filteredRDVs.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
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
                  className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-all"
                >
                  <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-gray-900">
                          {rdv.client?.prenom} {rdv.client?.nom}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          rdv.status === "completed" ? "bg-green-100 text-green-800 border-green-300 border-2" :
                          rdv.status === "confirmed" ? "bg-blue-100 text-blue-800 border-blue-300 border-2" :
                          rdv.status === "cancelled" ? "bg-red-100 text-red-800 border-red-300 border-2" :
                          "bg-yellow-100 text-yellow-800 border-yellow-300 border-2"
                        }`}>
                          {rdv.status === "completed" ? "Terminé" :
                           rdv.status === "confirmed" ? "Confirmé" :
                           rdv.status === "cancelled" ? "Annulé" : "En attente"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <span className="text-lg">📅</span>
                          <span className="font-medium">
                            {dayjs(rdv.date).format("dddd DD MMMM YYYY")} à {rdv.heure}
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
                    </div>

                    <div className="flex flex-col gap-2 lg:min-w-[200px]">
                      {rdv.status !== "completed" && rdv.status !== "cancelled" && (
                        <>
                          {rdv.status !== "confirmed" && !rdv.smsSent?.confirmation && (
                            <motion.button
                              onClick={() => confirmRDV(rdv._id)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                            >
                              ✅ Confirmer & Envoyer SMS
                            </motion.button>
                          )}
                          <motion.button
                            onClick={() => updateStatus(rdv._id, "completed")}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
                          >
                            ✅ Marquer comme réalisé
                          </motion.button>
                          <motion.button
                            onClick={() => updateStatus(rdv._id, "cancelled")}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-md hover:shadow-lg"
                          >
                            ❌ Annuler le RDV
                          </motion.button>
                        </>
                      )}
                      {rdv.status === "completed" && (
                        <motion.button
                          onClick={() => navigate(`/admin/centres/${user?.centreId}/rdv/${rdv._id}/photos`)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-900 transition-colors shadow-md hover:shadow-lg"
                        >
                          📸 Voir les photos
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
