import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../utils/api';

export default function CentreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [centre, setCentre] = useState(null);
  const [prestations, setPrestations] = useState([]);
  const [rdvs, setRdvs] = useState([]);
  const [calendar, setCalendar] = useState(null);
  const [activeTab, setActiveTab] = useState('rdv');
  const [loading, setLoading] = useState(true);

  const [newPrestation, setNewPrestation] = useState({
    nom: '',
    description: '',
    duree: 30,
    prix: 0
  });
  const [showPrestationForm, setShowPrestationForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [centreRes, prestationsRes, rdvsRes, calendarRes] = await Promise.all([
        api.get(`/centres/${id}`),
        api.get(`/prestations/centre/${id}`),
        api.get(`/rdv/centre/${id}`),
        api.get(`/calendar/${id}`)
      ]);
      
      setCentre(centreRes.data);
      setPrestations(prestationsRes.data);
      setRdvs(rdvsRes.data);
      setCalendar(calendarRes.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrestation = async (e) => {
    e.preventDefault();
    try {
      await api.post('/prestations', { ...newPrestation, centreId: id });
      setShowPrestationForm(false);
      setNewPrestation({ nom: '', description: '', duree: 30, prix: 0 });
      fetchData();
    } catch (error) {
      alert('Erreur lors de la création de la prestation');
    }
  };

  const handleUpdateRDVStatus = async (rdvId, status) => {
    try {
      await api.put(`/rdv/${rdvId}/status`, { status });
      fetchData();
    } catch (error) {
      alert('Erreur lors de la mise à jour');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (!centre) {
    return <div className="min-h-screen flex items-center justify-center">Centre non trouvé</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              ← Retour
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{centre.name}</h1>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {['rdv', 'prestations', 'calendrier', 'photos'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === tab
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'rdv' ? 'Rendez-vous' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* RDV Tab */}
        {activeTab === 'rdv' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">Rendez-vous</h2>
            <div className="space-y-4">
              {rdvs.map((rdv) => (
                <div key={rdv._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{rdv.client.prenom} {rdv.client.nom}</p>
                      <p className="text-sm text-gray-600">{rdv.client.email} - {rdv.client.telephone}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(rdv.date).toLocaleDateString('fr-FR')} à {rdv.heure}
                      </p>
                      <p className="text-sm text-gray-600">{rdv.prestationId?.nom} - {rdv.prestationId?.prix}€</p>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={rdv.status}
                        onChange={(e) => handleUpdateRDVStatus(rdv._id, e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="pending">En attente</option>
                        <option value="confirmed">Confirmé</option>
                        <option value="completed">Terminé</option>
                        <option value="cancelled">Annulé</option>
                      </select>
                      {rdv.status === 'completed' && (
                        <button
                          onClick={() => navigate(`/admin/centres/${id}/rdv/${rdv._id}/photos`)}
                          className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                        >
                          Photos
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {rdvs.length === 0 && (
                <p className="text-gray-500 text-center py-8">Aucun rendez-vous</p>
              )}
            </div>
          </div>
        )}

        {/* Prestations Tab */}
        {activeTab === 'prestations' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Prestations</h2>
              <button
                onClick={() => setShowPrestationForm(!showPrestationForm)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                {showPrestationForm ? 'Annuler' : '+ Ajouter'}
              </button>
            </div>

            {showPrestationForm && (
              <form onSubmit={handleAddPrestation} className="mb-6 p-4 border border-gray-200 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nom *</label>
                    <input
                      type="text"
                      value={newPrestation.nom}
                      onChange={(e) => setNewPrestation({ ...newPrestation, nom: e.target.value })}
                      required
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <input
                      type="text"
                      value={newPrestation.description}
                      onChange={(e) => setNewPrestation({ ...newPrestation, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Durée (min) *</label>
                    <input
                      type="number"
                      value={newPrestation.duree}
                      onChange={(e) => setNewPrestation({ ...newPrestation, duree: parseInt(e.target.value) })}
                      required
                      min="15"
                      step="15"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Prix (€) *</label>
                    <input
                      type="number"
                      value={newPrestation.prix}
                      onChange={(e) => setNewPrestation({ ...newPrestation, prix: parseFloat(e.target.value) })}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <button type="submit" className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg">
                  Créer
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prestations.map((prestation) => (
                <div key={prestation._id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-lg">{prestation.nom}</h3>
                  <p className="text-sm text-gray-600 mb-2">{prestation.description}</p>
                  <div className="flex justify-between text-sm">
                    <span>Durée: {prestation.duree} min</span>
                    <span className="font-semibold">{prestation.prix}€</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calendrier Tab */}
        {activeTab === 'calendrier' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">Calendrier</h2>
            <p className="text-gray-600 mb-4">
              Lien de réservation client: <a href={`/booking/${id}`} className="text-indigo-600 underline">{window.location.origin}/booking/{id}</a>
            </p>
            <p className="text-gray-500 text-sm">Le calendrier sera géré automatiquement selon les créneaux disponibles et les RDV existants.</p>
          </div>
        )}
      </div>
    </div>
  );
}

