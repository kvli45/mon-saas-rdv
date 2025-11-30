import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../../services/api";
import { removeToken } from "../../utils/auth";

export default function Dashboard() {
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCentres = async () => {
    try {
      const res = await api.get("/centres");
      setCentres(res.data);
    } catch (err) {
      console.error("Erreur:", err);
      if (err.response?.status === 401) {
        removeToken();
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCentres();
  }, []);

  const handleLogout = () => {
    removeToken();
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
                <span className="text-white font-bold text-lg">LC</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Centres partenaires</h2>
            <p className="text-gray-600">Gérez vos centres et leurs rendez-vous</p>
          </div>
          <div className="flex gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/admin/centres/map"
                className="btn-primary inline-flex items-center gap-2"
                style={{ backgroundColor: '#10b981' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
              >
                <span>🗺️</span>
                <span>Carte</span>
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/admin/centres/new"
                className="btn-primary inline-flex items-center gap-2"
              >
                <span>+</span>
                <span>Ajouter un centre</span>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Centres List */}
        {centres.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card text-center py-16"
          >
            <div className="text-5xl mb-4">🏢</div>
            <p className="text-gray-600 text-lg mb-4">Aucun centre enregistré.</p>
            <Link
              to="/admin/centres/new"
              className="text-primary-500 hover:text-primary-600 font-semibold underline"
            >
              Créer le premier centre
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {centres.map((centre, index) => (
              <motion.div
                key={centre._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                className="card hover:shadow-xl transition-all duration-300"
              >
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{centre.name}</h3>
                        {centre.email && (
                          <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                            <span>📧</span>
                            {centre.email}
                          </p>
                        )}
                        {centre.phone && (
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            <span>📞</span>
                            {centre.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2 font-medium">Lien client :</p>
                      <p className="text-xs font-mono text-primary-600 bg-primary-50 p-2 rounded break-all">
                        {window.location.origin}/booking/{centre._id}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-6 pt-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <Link
                        to={`/booking/${centre._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-green-500 text-white px-4 py-2.5 rounded-lg hover:bg-green-600 transition-colors text-sm font-semibold text-center shadow-md hover:shadow-lg"
                      >
                        📅 Lien Client
                      </Link>
                      <Link
                        to={`/admin/centres/${centre._id}`}
                        className="flex-1 text-white px-4 py-2.5 rounded-lg transition-colors text-sm font-semibold text-center shadow-md hover:shadow-lg"
                        style={{ backgroundColor: '#1D4ED8' }}
                        onMouseEnter={(e) => {
                          if (e.target) e.target.style.backgroundColor = '#1e40af';
                        }}
                        onMouseLeave={(e) => {
                          if (e.target) e.target.style.backgroundColor = '#1D4ED8';
                        }}
                      >
                        Gérer
                      </Link>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={`/admin/centres/${centre._id}/calendrier`}
                        className="flex-1 bg-blue-500 text-white px-4 py-2.5 rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold text-center shadow-md hover:shadow-lg"
                      >
                        📆 Calendrier
                      </Link>
                      <motion.button
                        onClick={async () => {
                          if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le centre "${centre.name}" ? Cette action est irréversible.`)) {
                            return;
                          }
                          try {
                            await api.delete(`/centres/${centre._id}`);
                            alert("Centre supprimé avec succès");
                            window.location.reload();
                          } catch (error) {
                            alert(error.response?.data?.message || "Erreur lors de la suppression");
                          }
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold shadow-md hover:shadow-lg"
                      >
                        🗑️ Supprimer
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
