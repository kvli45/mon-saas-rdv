import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import { removeToken } from '../../utils/auth';

export default function AdminDashboard() {
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCentre, setNewCentre] = useState({
    name: '',
    googleMapsLink: '',
    googleReviewLink: '',
    email: '',
    phone: '',
    address: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCentres();
  }, []);

  const fetchCentres = async () => {
    try {
      const { data } = await api.get('/centres');
      setCentres(data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCentre = async (e) => {
    e.preventDefault();
    try {
      await api.post('/centres', newCentre);
      setShowAddForm(false);
      setNewCentre({
        name: '',
        googleMapsLink: '',
        googleReviewLink: '',
        email: '',
        phone: '',
        address: ''
      });
      fetchCentres();
    } catch (error) {
      alert('Erreur lors de la création du centre');
    }
  };

  const handleLogout = () => {
    removeToken();
    navigate('/admin/login');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">LeadClean Admin</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Centres Partenaires</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {showAddForm ? 'Annuler' : '+ Ajouter un centre'}
          </button>
        </div>

        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-6 mb-6"
          >
            <form onSubmit={handleAddCentre} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du centre *
                  </label>
                  <input
                    type="text"
                    value={newCentre.name}
                    onChange={(e) => setNewCentre({ ...newCentre, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newCentre.email}
                    onChange={(e) => setNewCentre({ ...newCentre, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={newCentre.phone}
                    onChange={(e) => setNewCentre({ ...newCentre, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={newCentre.address}
                    onChange={(e) => setNewCentre({ ...newCentre, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lien Google Maps *
                  </label>
                  <input
                    type="url"
                    value={newCentre.googleMapsLink}
                    onChange={(e) => setNewCentre({ ...newCentre, googleMapsLink: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lien Avis Google *
                  </label>
                  <input
                    type="url"
                    value={newCentre.googleReviewLink}
                    onChange={(e) => setNewCentre({ ...newCentre, googleReviewLink: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
              >
                Créer le centre
              </button>
            </form>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {centres.map((centre) => (
            <motion.div
              key={centre._id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/admin/centres/${centre._id}`)}
            >
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{centre.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{centre.address || 'Adresse non renseignée'}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{centre.phone || 'Pas de téléphone'}</span>
                  <span className="text-indigo-600 font-medium">→ Gérer</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {centres.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Aucun centre. Ajoutez-en un pour commencer.
          </div>
        )}
      </div>
    </div>
  );
}

