import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import api from "../../services/api";

export default function PartnerAccountManager({ centreId }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchAccount();
  }, [centreId]);

  const fetchAccount = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/centres/${centreId}/partner-account`);
      if (res.data.exists) {
        setAccount(res.data.user);
        setForm({
          email: res.data.user.email,
          password: "",
          name: res.data.user.name
        });
      } else {
        setAccount(null);
        setForm({ email: "", password: "", name: "" });
      }
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.email || !form.password) {
      setError("Email et mot de passe requis");
      return;
    }

    try {
      if (account) {
        // Update existing account
        await api.put(`/centres/${centreId}/partner-account`, form);
        setSuccess("Compte partenaire mis à jour avec succès");
      } else {
        // Create new account
        await api.post(`/centres/${centreId}/partner-account`, form);
        setSuccess("Compte partenaire créé avec succès");
      }
      await fetchAccount();
      setShowForm(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError(error.response?.data?.message || "Erreur lors de la création/mise à jour");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce compte partenaire ?")) {
      return;
    }

    try {
      await api.put(`/centres/${centreId}/partner-account`, { isActive: false });
      setSuccess("Compte partenaire désactivé");
      await fetchAccount();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError(error.response?.data?.message || "Erreur lors de la désactivation");
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="text-center py-4">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="card"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <span className="w-1 h-8 rounded" style={{ backgroundColor: '#1D4ED8' }}></span>
        🔐 Compte partenaire
      </h2>

      {error && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-6"
        >
          <p className="font-medium text-sm">{error}</p>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded mb-6"
        >
          <p className="font-medium text-sm">{success}</p>
        </motion.div>
      )}

      {account ? (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Compte existant</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{account.email}</p>
                <p className="text-sm text-gray-600 mt-1">Nom: {account.name}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                account.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}>
                {account.isActive ? "Actif" : "Inactif"}
              </div>
            </div>
            <div className="flex gap-2">
              <motion.button
                onClick={() => setShowForm(!showForm)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-md"
              >
                {showForm ? "Masquer" : "Modifier"} le compte
              </motion.button>
              {account.isActive && (
                <motion.button
                  onClick={handleDelete}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-md"
                >
                  Désactiver
                </motion.button>
              )}
            </div>
          </div>

          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              onSubmit={handleSubmit}
              className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="input-field"
                  placeholder="partenaire@centre.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nouveau mot de passe (laisser vide pour ne pas changer)
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom du gérant
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder="Jean Dupont"
                />
              </div>
              <div className="flex gap-2">
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 btn-primary"
                >
                  Mettre à jour
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setForm({ email: account.email, password: "", name: account.name });
                    setError("");
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-gray-700"
                >
                  Annuler
                </motion.button>
              </div>
            </motion.form>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <p className="text-sm text-yellow-800 font-medium">
              Aucun compte partenaire n'a été créé pour ce centre. Créez-en un pour que le centre puisse accéder à son dashboard.
            </p>
          </div>

          <motion.button
            onClick={() => setShowForm(!showForm)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-md"
          >
            {showForm ? "Masquer" : "➕ Créer un compte partenaire"}
          </motion.button>

          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              onSubmit={handleSubmit}
              className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="input-field"
                  placeholder="partenaire@centre.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mot de passe *
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="input-field"
                  placeholder="••••••••"
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 caractères</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom du gérant
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder="Jean Dupont"
                />
              </div>
              <div className="flex gap-2">
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 btn-primary"
                >
                  Créer le compte
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setForm({ email: "", password: "", name: "" });
                    setError("");
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-gray-700"
                >
                  Annuler
                </motion.button>
              </div>
            </motion.form>
          )}
        </div>
      )}

      {account && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800 font-medium mb-2">🔗 Lien de connexion partenaire :</p>
          <p className="text-sm font-mono text-blue-900 bg-white px-3 py-2 rounded border border-blue-300">
            {window.location.origin}/centre/login
          </p>
          <p className="text-xs text-blue-700 mt-2">
            Identifiants : {account.email} / (mot de passe défini)
          </p>
        </div>
      )}
    </motion.div>
  );
}

