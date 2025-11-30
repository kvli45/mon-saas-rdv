import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../../services/api";
import Calendar from "../../components/admin/Calendar";
import PrestationsManager from "../../components/admin/PrestationsManager";
import RDVList from "../../components/admin/RDVList";
import PartnerAccountManager from "../../components/admin/PartnerAccountManager";

export default function CentreDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [centre, setCentre] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCentre = async () => {
      try {
        const res = await api.get(`/centres/${id}`);
        setCentre(res.data);
      } catch (error) {
        console.error("Erreur:", error);
        if (error.response?.status === 401) {
          navigate("/admin/login");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchCentre();
  }, [id, navigate]);

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

  if (!centre) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <p className="text-red-600 font-semibold text-lg">Centre non trouvé</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <motion.button
              onClick={() => navigate("/admin/dashboard")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mr-4 text-gray-600 hover:text-gray-900 flex items-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour
            </motion.button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1D4ED8' }}>
                <span className="text-white font-bold">LC</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{centre.name}</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Informations du centre */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="w-1 h-8 rounded" style={{ backgroundColor: '#1D4ED8' }}></span>
            Informations du centre
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {centre.email && (
              <div className="flex items-start gap-3">
                <span className="text-2xl">📧</span>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Email</p>
                  <p className="text-gray-900 font-medium">{centre.email}</p>
                </div>
              </div>
            )}
            {centre.phone && (
              <div className="flex items-start gap-3">
                <span className="text-2xl">📞</span>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Téléphone</p>
                  <p className="text-gray-900 font-medium">{centre.phone}</p>
                </div>
              </div>
            )}
            {centre.address && (
              <div className="flex items-start gap-3">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Adresse</p>
                  <p className="text-gray-900 font-medium">{centre.address}</p>
                </div>
              </div>
            )}
            {centre.googleMapsLink && (
              <div className="flex items-start gap-3">
                <span className="text-2xl">🗺️</span>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Google Maps</p>
                  <a
                    href={centre.googleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 font-medium hover:underline"
                  >
                    Voir sur Google Maps
                  </a>
                </div>
              </div>
            )}
            {centre.googleReviewLink && (
              <div className="flex items-start gap-3 md:col-span-2">
                <span className="text-2xl">⭐</span>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Lien Avis Google</p>
                  <a
                    href={centre.googleReviewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 font-medium hover:underline break-all"
                  >
                    {centre.googleReviewLink}
                  </a>
                </div>
              </div>
            )}
            {/* Lien public de réservation */}
            <div className="flex items-start gap-3 md:col-span-2 bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200">
              <span className="text-2xl">🔗</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Lien public de réservation</p>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <p className="text-sm font-mono text-gray-800 bg-white px-3 py-2 rounded border border-gray-300 break-all">
                    {window.location.origin}/booking/{centre._id}
                  </p>
                  <motion.a
                    href={`/booking/${centre._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all hover:bg-green-700"
                  >
                    <span>📅</span>
                    <span>Voir la page</span>
                  </motion.a>
                  <motion.button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/booking/${centre._id}`);
                      alert("Lien copié dans le presse-papier !");
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all hover:bg-gray-700"
                  >
                    <span>📋</span>
                    <span>Copier</span>
                  </motion.button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Partagez ce lien avec vos clients pour qu'ils puissent réserver en ligne
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Gestion compte partenaire */}
        <PartnerAccountManager centreId={centre._id} />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              to={`/admin/centres/${centre._id}/calendrier`}
              className="card hover:shadow-xl transition-all cursor-pointer text-center"
            >
              <div className="text-4xl mb-2">📆</div>
              <p className="font-semibold text-gray-900">Voir calendrier</p>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              to={`/admin/centres/${centre._id}/stats`}
              className="card hover:shadow-xl transition-all cursor-pointer text-center"
            >
              <div className="text-4xl mb-2">📊</div>
              <p className="font-semibold text-gray-900">Statistiques</p>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              to={`/admin/centres/${centre._id}/slots-generator`}
              className="card hover:shadow-xl transition-all cursor-pointer text-center"
            >
              <div className="text-4xl mb-2">⚡</div>
              <p className="font-semibold text-gray-900">Générer créneaux</p>
            </Link>
          </motion.div>
        </div>

        {/* Calendar & Prestations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <span className="w-1 h-8 rounded" style={{ backgroundColor: '#1D4ED8' }}></span>
              Calendrier
            </h2>
            <Calendar centreId={centre._id} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <span className="w-1 h-8 rounded" style={{ backgroundColor: '#10b981' }}></span>
              Prestations
            </h2>
            <PrestationsManager centreId={centre._id} />
          </motion.div>
        </div>

        {/* RDV List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="w-1 h-8 rounded" style={{ backgroundColor: '#9333ea' }}></span>
            Rendez-vous
          </h2>
          <RDVList centreId={centre._id} />
        </motion.div>
      </div>
    </div>
  );
}
