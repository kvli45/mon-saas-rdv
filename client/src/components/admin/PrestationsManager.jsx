import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import api from "../../services/api";

export default function PrestationsManager({ centreId }) {
  const [prestations, setPrestations] = useState([]);
  const [form, setForm] = useState({ 
    nom: "", 
    description: "",
    duree: 30, 
    prix: 0 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const fetchPrestations = async () => {
    try {
      const res = await api.get(`/prestations/centre/${centreId}`);
      setPrestations(res.data);
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  useEffect(() => {
    fetchPrestations();
  }, [centreId]);

  const handleAddPrestation = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/prestations", {
        ...form,
        centreId,
      });
      setForm({ nom: "", description: "", duree: 30, prix: 0 });
      setShowForm(false);
      fetchPrestations();
    } catch (error) {
      setError(error.response?.data?.message || "Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePrestation = async (prestationId) => {
    if (!window.confirm("Supprimer cette prestation ?")) return;

    try {
      await api.delete(`/prestations/${prestationId}`);
      fetchPrestations();
    } catch (error) {
      alert("Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded text-sm"
        >
          {error}
        </motion.div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {prestations.length} prestation{prestations.length > 1 ? "s" : ""}
        </p>
        <motion.button
          onClick={() => setShowForm(!showForm)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold shadow-md hover:shadow-lg"
          style={{ backgroundColor: '#1D4ED8' }}
          onMouseEnter={(e) => {
            if (e.target) e.target.style.backgroundColor = '#1e40af';
          }}
          onMouseLeave={(e) => {
            if (e.target) e.target.style.backgroundColor = '#1D4ED8';
          }}
        >
          {showForm ? "Annuler" : "+ Ajouter"}
        </motion.button>
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          onSubmit={handleAddPrestation}
          className="space-y-4 border-t pt-5"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nom de la prestation *
            </label>
            <input
              type="text"
              placeholder="Ex: Lavage Intérieur"
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              required
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description (optionnel)
            </label>
            <textarea
              placeholder="Description de la prestation..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows="2"
              className="input-field resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Durée (min) *
              </label>
              <input
                type="number"
                placeholder="30"
                value={form.duree}
                onChange={(e) => setForm({ ...form, duree: parseInt(e.target.value) || 0 })}
                required
                min="15"
                step="15"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Prix (€) *
              </label>
              <input
                type="number"
                placeholder="49.00"
                value={form.prix}
                onChange={(e) => setForm({ ...form, prix: parseFloat(e.target.value) || 0 })}
                required
                min="0"
                step="0.01"
                className="input-field"
              />
            </div>
          </div>
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="w-full btn-primary"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Ajout...
              </span>
            ) : (
              "Enregistrer la prestation"
            )}
          </motion.button>
        </motion.form>
      )}

      {prestations.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">🧾</div>
          <p className="text-gray-600 text-sm font-medium">Aucune prestation.</p>
          <p className="text-gray-500 text-xs mt-1">Ajoutez-en une pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prestations.map((p, index) => (
            <motion.div
              key={p._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg flex justify-between items-start hover:shadow-md transition-all border border-gray-200"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-bold text-gray-900">{p.nom}</h4>
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-semibold">
                    {p.prix}€
                  </span>
                </div>
                {p.description && (
                  <p className="text-sm text-gray-600 mb-2">{p.description}</p>
                )}
                <p className="text-xs text-gray-500">
                  ⏱️ {p.duree} minutes
                </p>
              </div>
              <motion.button
                onClick={() => handleDeletePrestation(p._id)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-red-500 hover:text-red-700 px-3 py-1.5 text-sm font-semibold hover:bg-red-50 rounded-lg transition-colors ml-4"
              >
                Supprimer
              </motion.button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
