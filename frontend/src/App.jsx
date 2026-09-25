import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Notifications from './pages/Notifications';
import TrackingPage from './pages/TrackingPage';

import DonorDashboard from './pages/DonorDashboard';
import AddDonation from './pages/AddDonation';
import DonationDetails from './pages/DonationDetails';

import NgoDashboard from './pages/NgoDashboard';
import NgoRequests from './pages/NgoRequests';

import DriverDashboard from './pages/DriverDashboard';

import AdminDashboard from './pages/AdminDashboard';
import AssignVehicle from './pages/AssignVehicle';
import AdminVehicles from './pages/AdminVehicles';
import AdminDrivers from './pages/AdminDrivers';

import Profile from './pages/Profile';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/tracking/:assignmentId" element={<ProtectedRoute><TrackingPage /></ProtectedRoute>} />

          {/* Donor */}
          <Route path="/donor" element={<ProtectedRoute roles={['DONOR']}><DonorDashboard /></ProtectedRoute>} />
          <Route path="/donor/add" element={<ProtectedRoute roles={['DONOR']}><AddDonation /></ProtectedRoute>} />
          <Route path="/donor/donations/:id" element={<ProtectedRoute roles={['DONOR']}><DonationDetails /></ProtectedRoute>} />

          {/* NGO */}
          <Route path="/ngo" element={<ProtectedRoute roles={['NGO']}><NgoDashboard /></ProtectedRoute>} />
          <Route path="/ngo/requests" element={<ProtectedRoute roles={['NGO']}><NgoRequests /></ProtectedRoute>} />

          {/* Driver */}
          <Route path="/driver" element={<ProtectedRoute roles={['DRIVER']}><DriverDashboard /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/assign" element={<ProtectedRoute roles={['ADMIN']}><AssignVehicle /></ProtectedRoute>} />
          <Route path="/admin/vehicles" element={<ProtectedRoute roles={['ADMIN']}><AdminVehicles /></ProtectedRoute>} />
          <Route path="/admin/drivers" element={<ProtectedRoute roles={['ADMIN']}><AdminDrivers /></ProtectedRoute>} />

          <Route path="*" element={<Home />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
