import { Routes, Route } from 'react-router-dom';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import CentreDetail from './pages/admin/CentreDetail';
import PhotoUpload from './pages/admin/PhotoUpload';
import BookingPage from './pages/client/BookingPage';
import RDVConfirmation from './pages/client/RDVConfirmation';
import RDVPhotos from './pages/client/RDVPhotos';

function App() {
  return (
    <Routes>
      {/* Admin routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/centres/:id" element={<CentreDetail />} />
      <Route path="/admin/centres/:id/rdv/:rdvId/photos" element={<PhotoUpload />} />
      
      {/* Client routes */}
      <Route path="/booking/:centreId" element={<BookingPage />} />
      <Route path="/rdv/:rdvId/confirmation" element={<RDVConfirmation />} />
      <Route path="/rdv/:rdvId/photos" element={<RDVPhotos />} />
      
      {/* Root redirect */}
      <Route path="/" element={<AdminLogin />} />
    </Routes>
  );
}

export default App;
