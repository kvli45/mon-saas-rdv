import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../../services/api";

export default function AddCentre() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    logoUrl: "",
    googleReviewLink: "",
    googleMapsLink: "",
    address: "",
    city: "",
    region: "",
    lat: "",
    lng: "",
    // Identifiants partenaire
    partnerEmail: "",
    partnerPassword: "",
    partnerName: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/centres", form);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la création du centre");
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Ajouter un centre</h1>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card shadow-xl"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-6"
            >
              <p className="font-medium">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nom du centre *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Ex: Lavage Pro Marseille"
                required
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="contact@example.com"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+33612345678"
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Adresse
              </label>
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="123 Avenue de la République, 13001 Marseille"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                URL Logo
              </label>
              <input
                type="url"
                name="logoUrl"
                value={form.logoUrl}
                onChange={handleChange}
                placeholder="https://example.com/logo.png"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lien Avis Google *
              </label>
              <input
                type="url"
                name="googleReviewLink"
                value={form.googleReviewLink}
                onChange={handleChange}
                placeholder="https://g.page/centre-lavage-pro"
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lien Google Maps
              </label>
              <input
                type="url"
                name="googleMapsLink"
                value={form.googleMapsLink}
                onChange={handleChange}
                placeholder="https://maps.google.com/?q=..."
                className="input-field"
              />
            </div>

            {/* Coordonnées géographiques */}
            <div className="border-t pt-5">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📍 Coordonnées géographiques (pour la carte)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ville
                  </label>
                  <input
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="Marseille"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Région
                  </label>
                  <input
                    name="region"
                    value={form.region}
                    onChange={handleChange}
                    placeholder="PACA"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="lat"
                    value={form.lat}
                    onChange={handleChange}
                    placeholder="43.2965"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="lng"
                    value={form.lng}
                    onChange={handleChange}
                    placeholder="5.3698"
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Identifiants partenaire */}
            <div className="border-t pt-5">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🔐 Identifiants partenaire (optionnel)</h3>
              <p className="text-sm text-gray-600 mb-4">
                Créez les identifiants pour que le centre puisse se connecter à son espace partenaire
              </p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nom du gérant
                  </label>
                  <input
                    name="partnerName"
                    value={form.partnerName}
                    onChange={handleChange}
                    placeholder="Jean Dupont"
                    className="input-field"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email partenaire
                    </label>
                    <input
                      type="email"
                      name="partnerEmail"
                      value={form.partnerEmail}
                      onChange={handleChange}
                      placeholder="partenaire@centre.com"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Mot de passe
                    </label>
                    <input
                      type="password"
                      name="partnerPassword"
                      value={form.partnerPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="input-field"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  * Si vous remplissez l'email et le mot de passe, un compte partenaire sera créé automatiquement
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t">
              <motion.button
                type="button"
                onClick={() => navigate("/admin/dashboard")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-gray-700"
              >
                Annuler
              </motion.button>
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="flex-1 btn-primary"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Enregistrement...
                  </span>
                ) : (
                  "Enregistrer le centre"
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
