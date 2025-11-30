import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../utils/api';

export default function PhotoUpload() {
  const { id, rdvId } = useParams();
  const navigate = useNavigate();
  const [rdv, setRdv] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('before');

  useEffect(() => {
    fetchRDV();
    fetchPhotos();
  }, [rdvId]);

  const fetchRDV = async () => {
    try {
      const { data } = await api.get(`/rdv/${rdvId}`);
      setRdv(data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const fetchPhotos = async () => {
    try {
      const { data } = await api.get(`/photos/rdv/${rdvId}`);
      setPhotos(data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    files.forEach(file => {
      formData.append('photos', file);
    });
    formData.append('rdvId', rdvId);
    formData.append('type', selectedType);

    try {
      await api.post('/photos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      fetchPhotos();
      e.target.value = ''; // Reset input
    } catch (error) {
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!confirm('Supprimer cette photo ?')) return;
    
    try {
      await api.delete(`/photos/${photoId}`);
      fetchPhotos();
    } catch (error) {
      alert('Erreur lors de la suppression');
    }
  };

  if (!rdv) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  const beforePhotos = photos.filter(p => p.type === 'before');
  const afterPhotos = photos.filter(p => p.type === 'after');

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate(`/admin/centres/${id}`)}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              ← Retour
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Photos - RDV #{rdvId}</h1>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {rdv.client.prenom} {rdv.client.nom} - {new Date(rdv.date).toLocaleDateString('fr-FR')} à {rdv.heure}
          </h2>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Uploader des photos</h3>
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setSelectedType('before')}
              className={`px-4 py-2 rounded-lg ${
                selectedType === 'before'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Avant
            </button>
            <button
              onClick={() => setSelectedType('after')}
              className={`px-4 py-2 rounded-lg ${
                selectedType === 'after'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Après
            </button>
          </div>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {uploading && <p className="mt-2 text-sm text-gray-600">Upload en cours...</p>}
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">Photos Avant ({beforePhotos.length})</h3>
            {beforePhotos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {beforePhotos.map((photo) => (
                  <div key={photo._id} className="relative group">
                    <img
                      src={`http://localhost:5000${photo.url}`}
                      alt="Avant"
                      className="w-full aspect-square object-cover rounded-lg shadow"
                    />
                    <button
                      onClick={() => handleDeletePhoto(photo._id)}
                      className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Aucune photo avant</p>
            )}
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Photos Après ({afterPhotos.length})</h3>
            {afterPhotos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {afterPhotos.map((photo) => (
                  <div key={photo._id} className="relative group">
                    <img
                      src={`http://localhost:5000${photo.url}`}
                      alt="Après"
                      className="w-full aspect-square object-cover rounded-lg shadow"
                    />
                    <button
                      onClick={() => handleDeletePhoto(photo._id)}
                      className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Aucune photo après</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

