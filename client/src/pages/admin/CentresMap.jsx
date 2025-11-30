import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../../services/api";

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function CentresMap() {
  const navigate = useNavigate();
  const [centres, setCentres] = useState([]);
  const [filteredCentres, setFilteredCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [mapCenter, setMapCenter] = useState([46.2276, 2.2137]); // Centre de la France
  const [mapZoom, setMapZoom] = useState(6);

  useEffect(() => {
    fetchCentres();
  }, []);

  useEffect(() => {
    filterCentres();
  }, [centres, searchTerm, selectedCity]);

  useEffect(() => {
    if (filteredCentres.length > 0) {
      const validCentres = filteredCentres.filter(c => c.lat && c.lng);
      if (validCentres.length > 0) {
        const avgLat = validCentres.reduce((sum, c) => sum + c.lat, 0) / validCentres.length;
        const avgLng = validCentres.reduce((sum, c) => sum + c.lng, 0) / validCentres.length;
        setMapCenter([avgLat, avgLng]);
        setMapZoom(validCentres.length === 1 ? 13 : 6);
      }
    }
  }, [filteredCentres]);

  const fetchCentres = async () => {
    setLoading(true);
    try {
      const res = await api.get("/centres/map/all");
      setCentres(res.data);
      setFilteredCentres(res.data);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterCentres = () => {
    let filtered = [...centres];

    if (searchTerm) {
      filtered = filtered.filter(centre =>
        centre.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        centre.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        centre.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCity) {
      filtered = filtered.filter(centre => centre.city === selectedCity);
    }

    setFilteredCentres(filtered);
  };

  const cities = [...new Set(centres.map(c => c.city).filter(Boolean))].sort();
  const validCentres = filteredCentres.filter(c => c.lat && c.lng);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#1D4ED8', borderTopColor: 'transparent' }}></div>
          <p className="text-gray-600 font-medium">Chargement de la carte...</p>
        </div>
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
              <h1 className="text-2xl font-bold text-gray-900">📍 Carte des Centres</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🔍 Recherche
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom, ville, adresse..."
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📍 Filtrer par ville
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="input-field"
              >
                <option value="">Toutes les villes</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>
              {filteredCentres.length} centre{filteredCentres.length > 1 ? "s" : ""} affiché{filteredCentres.length > 1 ? "s" : ""}
              {centres.length !== filteredCentres.length && ` (${centres.length} au total)`}
            </p>
          </div>
        </motion.div>

        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-0 overflow-hidden"
        >
          {validCentres.length > 0 ? (
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              className="h-[600px] w-full rounded-xl"
              style={{ minHeight: "600px" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {validCentres.map((centre) => (
                <Marker
                  key={centre._id}
                  position={[centre.lat, centre.lng]}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-gray-900 text-lg mb-2">{centre.name}</h3>
                      {centre.address && (
                        <p className="text-sm text-gray-600 mb-1">📍 {centre.address}</p>
                      )}
                      {centre.city && (
                        <p className="text-sm text-gray-600 mb-1">🏙️ {centre.city}</p>
                      )}
                      {centre.region && (
                        <p className="text-sm text-gray-600 mb-1">🌍 {centre.region}</p>
                      )}
                      {centre.phone && (
                        <p className="text-sm text-gray-600 mb-1">📞 {centre.phone}</p>
                      )}
                      {centre.email && (
                        <p className="text-sm text-gray-600 mb-3">✉️ {centre.email}</p>
                      )}
                      <Link
                        to={`/admin/centres/${centre._id}`}
                        className="inline-block text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                        style={{ backgroundColor: '#1D4ED8' }}
                      >
                        Gérer ce centre
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="h-[600px] flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="text-5xl mb-4">🗺️</div>
                <p className="text-gray-600 font-medium text-lg">Aucun centre avec coordonnées trouvé</p>
                <p className="text-sm text-gray-500 mt-2">Ajoutez des coordonnées (lat/lng) aux centres pour les voir sur la carte</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Centres List */}
        {filteredCentres.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card mt-6"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <span className="w-1 h-8 rounded" style={{ backgroundColor: '#1D4ED8' }}></span>
              Liste des centres ({filteredCentres.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCentres.map((centre, index) => (
                <motion.div
                  key={centre._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-900">{centre.name}</h3>
                    {centre.lat && centre.lng ? (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
                        📍 Sur carte
                      </span>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-semibold">
                        ⚠️ Pas de coordonnées
                      </span>
                    )}
                  </div>
                  {centre.address && (
                    <p className="text-sm text-gray-600 mb-1">📍 {centre.address}</p>
                  )}
                  {centre.city && (
                    <p className="text-sm text-gray-600 mb-1">🏙️ {centre.city}</p>
                  )}
                  {centre.phone && (
                    <p className="text-sm text-gray-600 mb-1">📞 {centre.phone}</p>
                  )}
                  <motion.button
                    onClick={() => navigate(`/admin/centres/${centre._id}`)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="mt-3 w-full text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg"
                    style={{ backgroundColor: '#1D4ED8' }}
                  >
                    Gérer
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {filteredCentres.length === 0 && (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">🗺️</div>
            <p className="text-gray-600 font-medium text-lg">Aucun centre trouvé</p>
            <p className="text-sm text-gray-500 mt-2">Essayez de modifier vos filtres</p>
          </div>
        )}
      </div>
    </div>
  );
}
