import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../../services/api";

export default function RDVPhotos() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [rdv, setRdv] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchRdv = async () => {
    try {
      const res = await api.get(`/rdv/${id}`);
      setRdv(res.data);
      setUnlocked(res.data.avisGoogleLeft || false);
      
      if (res.data.avisGoogleLeft || token) {
        try {
          const photosRes = await api.get(`/photos/rdv/${id}`, { 
            params: token ? { token } : {} 
          });
          setPhotos(photosRes.data || []);
        } catch (err) {
          console.error("Erreur chargement photos:", err);
        }
      }
    } catch (error) {
      console.error("Erreur:", error);
      setError("Erreur lors du chargement du RDV");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRdv();
    }
  }, [id, token]);

  const confirmAvis = async () => {
    setSubmitting(true);
    setError("");
    
    try {
      await api.post(`/rdv/${id}/avis`, { token: token || "" });
      setUnlocked(true);
      await fetchRdv();
    } catch (error) {
      setError(error.response?.data?.message || "Erreur lors de la confirmation de l'avis");
    } finally {
      setSubmitting(false);
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

  if (!rdv) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <p className="text-red-600 font-semibold text-lg mb-4">Rendez-vous non trouvé</p>
          {error && <p className="text-sm text-gray-500">{error}</p>}
        </div>
      </div>
    );
  }

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const beforePhotos = photos.filter(p => p.type === "before");
  const afterPhotos = photos.filter(p => p.type === "after");
  const googleReviewLink = rdv.centreId?.googleReviewLink || "#";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-8 px-4 sm:py-12">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="card shadow-xl"
        >
          {/* Header */}
          <div className="text-center mb-8 pb-6 border-b border-gray-200">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              Vos photos – {rdv.client?.prenom} {rdv.client?.nom}
            </h1>
            <p className="text-gray-600 text-lg">
              Prestation : {rdv.prestationId?.nom || "N/A"} – {formatDate(rdv.date)} à {rdv.heure}
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6"
            >
              <p className="font-medium">{error}</p>
            </motion.div>
          )}

          {!unlocked ? (
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400 text-yellow-900 p-8 sm:p-10 rounded-xl shadow-lg"
            >
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="text-6xl mb-4"
                >
                  🔒
                </motion.div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Photos verrouillées</h2>
                <p className="text-lg text-yellow-800">
                  Pour débloquer vos photos avant/après, merci de laisser un avis sur Google !
                </p>
              </div>
              
              <div className="space-y-4 max-w-md mx-auto">
                <a
                  href={googleReviewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-yellow-500 text-white px-6 py-4 rounded-lg font-semibold hover:bg-yellow-600 transition-all duration-200 text-center text-lg shadow-md hover:shadow-lg"
                >
                  ⭐ Laisser un avis Google
                </a>
                <motion.button
                  onClick={confirmAvis}
                  disabled={submitting}
                  whileHover={{ scale: submitting ? 1 : 1.02 }}
                  whileTap={{ scale: submitting ? 1 : 0.98 }}
                  className="w-full bg-green-500 text-white px-6 py-4 rounded-lg font-semibold hover:bg-green-600 transition-all duration-200 text-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Vérification...
                    </span>
                  ) : (
                    "✅ J'ai laissé un avis"
                  )}
                </motion.button>
              </div>
              
              <p className="text-sm text-yellow-700 mt-6 text-center max-w-md mx-auto">
                💡 Après avoir laissé votre avis, cliquez sur le bouton ci-dessus pour déverrouiller vos photos
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-10"
            >
              {photos.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl">
                  <div className="text-5xl mb-4">📸</div>
                  <p className="text-gray-600 text-lg font-medium">Aucune photo disponible pour le moment.</p>
                  <p className="text-sm text-gray-500 mt-2">Les photos seront disponibles une fois uploadées par le centre.</p>
                </div>
              ) : (
                <>
                  {beforePhotos.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-1 h-10 bg-blue-500 rounded"></div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Photos Avant</h2>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {beforePhotos.map((photo, index) => (
                          <motion.div
                            key={photo._id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.05 }}
                            className="relative aspect-square rounded-xl overflow-hidden shadow-lg cursor-pointer group"
                          >
                            <img
                              src={`${API_URL}${photo.url}`}
                              alt="avant"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                              <span className="text-white text-sm font-semibold">Avant</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {afterPhotos.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-1 h-10 bg-green-500 rounded"></div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Photos Après</h2>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {afterPhotos.map((photo, index) => (
                          <motion.div
                            key={photo._id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.05 }}
                            className="relative aspect-square rounded-xl overflow-hidden shadow-lg cursor-pointer group"
                          >
                            <img
                              src={`${API_URL}${photo.url}`}
                              alt="après"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                              <span className="text-white text-sm font-semibold">Après</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
