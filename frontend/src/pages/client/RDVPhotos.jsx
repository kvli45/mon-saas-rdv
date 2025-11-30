import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../utils/api';

export default function RDVPhotos() {
  const { rdvId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [rdv, setRdv] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avisLeft, setAvisLeft] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [rdvId, token]);

  const fetchData = async () => {
    try {
      const [rdvRes, photosRes] = await Promise.all([
        api.get(`/rdv/${rdvId}`),
        api.get(`/photos/rdv/${rdvId}`, { params: { token } }).catch(() => ({ data: [] }))
      ]);
      
      setRdv(rdvRes.data);
      setAvisLeft(rdvRes.data.avisGoogleLeft);
      
      if (rdvRes.data.avisGoogleLeft || token) {
        setPhotos(photosRes.data || []);
      }
    } catch (error) {
      console.error('Erreur:', error);
      if (error.response?.status === 403) {
        setAvisLeft(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAvisLeft = async () => {
    setSubmitting(true);
    try {
      await api.put(`/rdv/${rdvId}/avis`, { token });
      setAvisLeft(true);
      fetchData();
    } catch (error) {
      alert('Erreur lors de la confirmation de l\'avis');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (!rdv) {
    return <div className="min-h-screen flex items-center justify-center">Rendez-vous non trouvé</div>;
  }

  const beforePhotos = photos.filter(p => p.type === 'before');
  const afterPhotos = photos.filter(p => p.type === 'after');

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Photos du service</h1>
          <p className="text-gray-600 mb-8">
            {rdv.centreId?.name} - {new Date(rdv.date).toLocaleDateString('fr-FR')}
          </p>

          {!avisLeft && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-yellow-900 mb-4">
                Accès aux photos verrouillé
              </h2>
              <p className="text-yellow-800 mb-4">
                Pour accéder aux photos avant/après du nettoyage, merci de laisser un avis Google.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href={rdv.centreId?.googleReviewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-700 transition-colors text-center"
                >
                  Laisser un avis Google →
                </a>
                <button
                  onClick={handleAvisLeft}
                  disabled={submitting}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Vérification...' : "J'ai laissé un avis"}
                </button>
              </div>
            </div>
          )}

          {avisLeft && photos.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>Aucune photo disponible pour le moment.</p>
            </div>
          )}

          {avisLeft && photos.length > 0 && (
            <div className="space-y-8">
              {beforePhotos.length > 0 && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Avant</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {beforePhotos.map((photo) => (
                      <motion.div
                        key={photo._id}
                        whileHover={{ scale: 1.05 }}
                        className="relative aspect-square rounded-lg overflow-hidden shadow-md"
                      >
                        <img
                          src={`http://localhost:5000${photo.url}`}
                          alt="Avant"
                          className="w-full h-full object-cover"
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {afterPhotos.length > 0 && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Après</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {afterPhotos.map((photo) => (
                      <motion.div
                        key={photo._id}
                        whileHover={{ scale: 1.05 }}
                        className="relative aspect-square rounded-lg overflow-hidden shadow-md"
                      >
                        <img
                          src={`http://localhost:5000${photo.url}`}
                          alt="Après"
                          className="w-full h-full object-cover"
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

