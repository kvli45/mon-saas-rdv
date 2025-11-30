import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../../services/api";

export default function RDVPhotos() {
  const { id, rdvId } = useParams();
  const navigate = useNavigate();
  const [rdv, setRdv] = useState(null);
  const [beforeFiles, setBeforeFiles] = useState([]);
  const [afterFiles, setAfterFiles] = useState([]);
  const [beforePhotos, setBeforePhotos] = useState([]);
  const [afterPhotos, setAfterPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendingSMS, setSendingSMS] = useState(false);

  const actualRdvId = rdvId || id;

  const fetchRdv = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/rdv/${actualRdvId}`);
      setRdv(res.data);
      
      const photosRes = await api.get(`/photos/rdv/${actualRdvId}`);
      const photos = photosRes.data || [];
      setBeforePhotos(photos.filter(p => p.type === "before"));
      setAfterPhotos(photos.filter(p => p.type === "after"));
    } catch (error) {
      console.error("Erreur:", error);
      setError(error.response?.data?.message || "Erreur lors du chargement du RDV");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (actualRdvId) {
      fetchRdv();
    }
  }, [actualRdvId]);

  const handleUpload = async (type) => {
    const files = type === "before" ? beforeFiles : afterFiles;
    
    if (files.length === 0) {
      setError("Veuillez sélectionner au moins une photo");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("photos", file);
      });
      formData.append("rdvId", actualRdvId);
      formData.append("type", type);

      await api.post("/photos", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (type === "before") {
        setBeforeFiles([]);
      } else {
        setAfterFiles([]);
      }

      await fetchRdv();
      
      alert(`✅ Photos ${type === "before" ? "avant" : "après"} uploadées avec succès !`);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'upload des photos");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm("Supprimer cette photo ?")) return;

    try {
      await api.delete(`/photos/${photoId}`);
      await fetchRdv();
    } catch (error) {
      alert("Erreur lors de la suppression");
    }
  };

  const handleSendAfterServiceSMS = async () => {
    if (!window.confirm("Envoyer le SMS au client avec le lien des photos et l'avis Google ?")) return;

    setSendingSMS(true);
    setError("");

    try {
      const res = await api.post(`/rdv/send-after-service/${actualRdvId}`);
      alert(`✅ SMS envoyé avec succès !\n\nLien photos : ${res.data.photoUrl}`);
      await fetchRdv();
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Erreur lors de l'envoi du SMS";
      const errorDetails = err.response?.data?.error || err.response?.data?.details || "";
      setError(`${errorMessage}${errorDetails ? `\n\nDétails: ${JSON.stringify(errorDetails)}` : ""}`);
      console.error("Erreur SMS:", err.response?.data);
    } finally {
      setSendingSMS(false);
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
        <p className="text-red-600 font-semibold text-lg">RDV non trouvé</p>
      </div>
    );
  }

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <motion.button
              onClick={() => navigate(-1)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mr-4 text-gray-600 hover:text-gray-900 flex items-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour
            </motion.button>
            <h1 className="text-2xl font-bold text-gray-900">
              Upload Photos – {rdv.client?.prenom} {rdv.client?.nom}
            </h1>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* RDV Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="w-1 h-8 bg-primary-500 rounded"></span>
            Informations du RDV
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Prestation</p>
              <p className="text-gray-900 font-semibold">{rdv.prestationId?.nom || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Date</p>
              <p className="text-gray-900 font-semibold">
                {formatDate(rdv.date)} à {rdv.heure}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Client</p>
              <p className="text-gray-900 font-semibold">
                {rdv.client?.prenom} {rdv.client?.nom}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Téléphone</p>
              <p className="text-gray-900 font-semibold">{rdv.client?.telephone}</p>
            </div>
            {rdv.client?.vehicule && (
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Véhicule</p>
                <p className="text-gray-900 font-semibold">{rdv.client.vehicule}</p>
              </div>
            )}
            {rdv.photosAccessToken && (
              <div className="md:col-span-2">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Lien client</p>
                <a
                  href={`${window.location.origin}/rdv/${actualRdvId}/photos?token=${rdv.photosAccessToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 hover:underline break-all font-medium block bg-primary-50 p-3 rounded-lg"
                >
                  {window.location.origin}/rdv/{actualRdvId}/photos?token={rdv.photosAccessToken}
                </a>
              </div>
            )}
            <div className="md:col-span-2 flex items-center gap-4 pt-4 border-t">
              {rdv.smsSent?.afterService ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                  <span>✅</span>
                  <span className="font-semibold">SMS après service envoyé</span>
                </div>
              ) : (
                <>
                  <motion.button
                    onClick={handleSendAfterServiceSMS}
                    disabled={sendingSMS || (beforePhotos.length === 0 && afterPhotos.length === 0)}
                    whileHover={{ scale: sendingSMS || (beforePhotos.length === 0 && afterPhotos.length === 0) ? 1 : 1.05 }}
                    whileTap={{ scale: sendingSMS || (beforePhotos.length === 0 && afterPhotos.length === 0) ? 1 : 0.95 }}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg"
                  >
                    {sendingSMS ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Envoi...
                      </span>
                    ) : (
                      "📲 Envoyer SMS avec photos"
                    )}
                  </motion.button>
                  {beforePhotos.length === 0 && afterPhotos.length === 0 && (
                    <p className="text-sm text-gray-500">Ajoutez des photos avant d'envoyer le SMS</p>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6 whitespace-pre-wrap"
          >
            <p className="font-semibold mb-1">❌ Erreur</p>
            <p className="text-sm">{error}</p>
            <p className="text-xs mt-2 text-red-600">
              💡 Vérifiez que le numéro de téléphone est au bon format (ex: +33612345678) et que votre quota TextBelt n'est pas dépassé.
            </p>
          </motion.div>
        )}

        {/* Photos Avant */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-10 bg-blue-500 rounded"></div>
            <h2 className="text-2xl font-bold text-gray-900">Photos Avant</h2>
          </div>
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setBeforeFiles(Array.from(e.target.files))}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <motion.button
                onClick={() => handleUpload("before")}
                disabled={uploading || beforeFiles.length === 0}
                whileHover={{ scale: uploading || beforeFiles.length === 0 ? 1 : 1.05 }}
                whileTap={{ scale: uploading || beforeFiles.length === 0 ? 1 : 0.95 }}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg whitespace-nowrap"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Upload...
                  </span>
                ) : (
                  "Upload Avant"
                )}
              </motion.button>
            </div>

            {beforePhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
                {beforePhotos.map((photo, index) => (
                  <motion.div
                    key={photo._id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative group aspect-square rounded-xl overflow-hidden shadow-lg"
                  >
                    <img
                      src={`${API_URL}${photo.url}`}
                      alt="avant"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <motion.button
                      onClick={() => handleDeletePhoto(photo._id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      Supprimer
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            )}

            {beforePhotos.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <div className="text-4xl mb-3">📸</div>
                <p className="text-gray-500 text-sm font-medium">Aucune photo avant uploadée</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Photos Après */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-10 bg-green-500 rounded"></div>
            <h2 className="text-2xl font-bold text-gray-900">Photos Après</h2>
          </div>
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setAfterFiles(Array.from(e.target.files))}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              <motion.button
                onClick={() => handleUpload("after")}
                disabled={uploading || afterFiles.length === 0}
                whileHover={{ scale: uploading || afterFiles.length === 0 ? 1 : 1.05 }}
                whileTap={{ scale: uploading || afterFiles.length === 0 ? 1 : 0.95 }}
                className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg whitespace-nowrap"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Upload...
                  </span>
                ) : (
                  "Upload Après"
                )}
              </motion.button>
            </div>

            {afterPhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
                {afterPhotos.map((photo, index) => (
                  <motion.div
                    key={photo._id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative group aspect-square rounded-xl overflow-hidden shadow-lg"
                  >
                    <img
                      src={`${API_URL}${photo.url}`}
                      alt="après"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <motion.button
                      onClick={() => handleDeletePhoto(photo._id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      Supprimer
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            )}

            {afterPhotos.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <div className="text-4xl mb-3">📸</div>
                <p className="text-gray-500 text-sm font-medium">Aucune photo après uploadée</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-5 text-sm text-blue-800"
        >
          <p className="font-bold mb-2">💡 Informations</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li>Les photos sont stockées localement dans le dossier /uploads</li>
            <li>Le lien client sera généré automatiquement quand le RDV sera marqué comme "Terminé"</li>
            <li>Le client devra laisser un avis Google pour accéder aux photos</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
