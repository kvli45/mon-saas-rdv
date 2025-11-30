import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import AddCentre from "./pages/admin/AddCentre";
import CentreDetails from "./pages/admin/CentreDetails";
import RDVPhotosAdmin from "./pages/admin/RDVPhotos";
import CentreCalendar from "./pages/admin/CentreCalendar";
import CentreStats from "./pages/admin/CentreStats";
import SlotsGenerator from "./pages/admin/SlotsGenerator";
import CentresMap from "./pages/admin/CentresMap";
import CentreLogin from "./pages/centre/CentreLogin";
import CentreDashboard from "./pages/centre/CentreDashboard";
import BookingPage from "./pages/client/BookingPage";
import RDVConfirmation from "./pages/client/RDVConfirmation";
import RDVPhotos from "./pages/client/RDVPhotos";
import { isAuthenticated } from "./utils/auth";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/admin/login" />;
};

function App() {
  return (
    <Routes>
      {/* Admin routes */}
      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/centres/new"
        element={
          <ProtectedRoute>
            <AddCentre />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/centres/:id"
        element={
          <ProtectedRoute>
            <CentreDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/centres/:id/calendrier"
        element={
          <ProtectedRoute>
            <CentreCalendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/centres/:id/stats"
        element={
          <ProtectedRoute>
            <CentreStats />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/centres/:id/slots-generator"
        element={
          <ProtectedRoute>
            <SlotsGenerator />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/centres/map"
        element={
          <ProtectedRoute>
            <CentresMap />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/centres/:id/rdv/:rdvId/photos"
        element={
          <ProtectedRoute>
            <RDVPhotosAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/rdv/:id"
        element={
          <ProtectedRoute>
            <RDVPhotosAdmin />
          </ProtectedRoute>
        }
      />

      {/* Centre Partner routes */}
      <Route path="/centre/login" element={<CentreLogin />} />
      <Route path="/centre/dashboard" element={<CentreDashboard />} />

      {/* Client routes */}
      <Route path="/booking/:centreId" element={<BookingPage />} />
      <Route path="/rdv/:id/confirmation" element={<RDVConfirmation />} />
      <Route path="/rdv/:id/photos" element={<RDVPhotos />} />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/admin/login" />} />
    </Routes>
  );
}

export default App;
