import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../../services/api";
import dayjs from "dayjs";
import "dayjs/locale/fr";

dayjs.locale("fr");

export default function CentreCalendar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rdvs, setRdvs] = useState([]);
  const [slots, setSlots] = useState([]);
  const [centre, setCentre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [centreRes, rdvsRes, slotsRes] = await Promise.all([
        api.get(`/centres/${id}`),
        api.get(`/rdv/by-centre/${id}`),
        api.get(`/rdv/slots/all/${id}`)
      ]);
      
      setCentre(centreRes.data);
      setRdvs(rdvsRes.data || []);
      setSlots(slotsRes.data || []);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  // Generate next 30 days
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = dayjs().add(i, "day");
    const iso = date.format("YYYY-MM-DD");
    
    // Check if has RDV
    const hasRDV = rdvs.some((r) => {
      const rdvDate = dayjs(r.date).format("YYYY-MM-DD");
      return rdvDate === iso;
    });
    
    // Check if has available slots
    const daySlots = slots.find((s) => s.date === iso);
    const hasSlot = !!daySlots && daySlots.hours && daySlots.hours.length > 0;
    
    // Get RDVs for this day
    const dayRDVs = rdvs.filter((r) => {
      const rdvDate = dayjs(r.date).format("YYYY-MM-DD");
      return rdvDate === iso;
    });
    
    return {
      date: iso,
      dateObj: date,
      hasRDV,
      hasSlot,
      rdvs: dayRDVs,
      slots: daySlots?.hours || []
    };
  });

  const formatDate = (dateStr) => {
    return dayjs(dateStr).format("dddd DD MMMM");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#1D4ED8', borderTopColor: 'transparent' }}></div>
          <p className="text-gray-600 font-medium">Chargement du calendrier...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">
                Calendrier – {centre?.name || "Centre"}
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Legend */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Légende</h2>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-100 border-2 border-green-500 rounded"></div>
              <span className="text-sm font-medium text-gray-700">🟢 Disponible (créneaux libres)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 border-2 border-blue-500 rounded"></div>
              <span className="text-sm font-medium text-gray-700">📅 Avec RDV</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-100 border-2 border-red-500 rounded"></div>
              <span className="text-sm font-medium text-gray-700">🔴 Complet (pas de créneaux)</span>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {days.map((day, index) => {
            const isToday = day.date === dayjs().format("YYYY-MM-DD");
            const status = day.hasSlot ? "available" : day.hasRDV ? "booked" : "unavailable";
            
            return (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => setSelectedDate(selectedDate === day.date ? null : day.date)}
                className={`p-4 rounded-xl shadow-md text-center font-medium cursor-pointer transition-all hover:shadow-lg ${
                  status === "available"
                    ? "bg-green-50 border-2 border-green-500 text-green-800"
                    : status === "booked"
                    ? "bg-blue-50 border-2 border-blue-500 text-blue-800"
                    : "bg-red-50 border-2 border-red-500 text-red-800"
                } ${isToday ? "ring-4 ring-yellow-400" : ""}`}
              >
                <p className="text-xs text-gray-500 mb-1">
                  {day.dateObj.format("ddd")}
                </p>
                <p className="text-lg font-bold mb-2">
                  {day.dateObj.format("DD")}
                </p>
                <p className="text-xs mb-2">
                  {day.dateObj.format("MMM")}
                </p>
                
                {day.hasRDV && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold">
                      📅 {day.rdvs.length} RDV{day.rdvs.length > 1 ? "s" : ""}
                    </p>
                  </div>
                )}
                
                {day.hasSlot && !day.hasRDV && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold">
                      🟢 {day.slots.length} créneau{day.slots.length > 1 ? "x" : ""}
                    </p>
                  </div>
                )}
                
                {!day.hasSlot && !day.hasRDV && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold">🔴 Complet</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Selected Date Details */}
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card mt-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-1 h-8 rounded" style={{ backgroundColor: '#1D4ED8' }}></span>
              Détails du {formatDate(selectedDate)}
            </h2>
            
            {(() => {
              const day = days.find((d) => d.date === selectedDate);
              if (!day) return null;
              
              return (
                <div className="space-y-4">
                  {day.rdvs.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-3">Rendez-vous ({day.rdvs.length})</h3>
                      <div className="space-y-2">
                        {day.rdvs.map((rdv) => (
                          <div
                            key={rdv._id}
                            className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                          >
                            <p className="font-semibold text-gray-900">
                              {rdv.client?.prenom} {rdv.client?.nom}
                            </p>
                            <p className="text-sm text-gray-600">
                              {rdv.heure} – {rdv.prestationId?.nom || "Prestation"}
                            </p>
                            <p className="text-xs text-gray-500">
                              📞 {rdv.client?.telephone}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {day.slots.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-3">
                        Créneaux disponibles ({day.slots.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {day.slots.map((hour, i) => (
                          <span
                            key={i}
                            className="bg-green-100 text-green-800 px-3 py-1 rounded-lg text-sm font-medium"
                          >
                            {hour}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {day.rdvs.length === 0 && day.slots.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-600 font-medium">Aucun rendez-vous ni créneau disponible</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}
      </div>
    </div>
  );
}

