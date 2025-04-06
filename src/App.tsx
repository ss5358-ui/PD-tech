import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore } from './lib/store';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Clients from './pages/Clients';
import AllClients from './pages/AllClients';
import AllClientProfile from './pages/AllClientProfile';
import ClientProfile from './pages/ClientProfile';
import EClientProfile from './pages/EClientProfile';
import SiteVisit from './pages/SiteVisit';
import SiteVisitForm from './pages/SiteVisitForm';
import ClientsHistory from './pages/ClientsHistory';
import Notifications from './pages/Notifications';
import XLdata from './pages/xldata';
import EClients from './pages/EClients';
import FClients from './pages/FClients';
import DocumentsUpload from './pages/DocumentsUpload';
import ClientsHistoryProfile from './pages/ClientsHistoryProfile';
import AllPdKitsPage from './pages/AllPdKitsPage';
import Layout from './components/Layout';
import Nav from './components/Nav';
import FClientProfile from './pages/FClientProfile';
import TimeInsights from './pages/TimeInsights';

function RoleBasedRoute({ children, requiredRoles }: { children: React.ReactNode; requiredRoles: string[] }) {
  const role = useStore((state) => state.role);
  return requiredRoles.includes(role || '') ? children : <Navigate to="/dashboard" />;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useStore((state) => state.user);
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const location = useLocation();
  const showNav = location.pathname !== '/login';
  const role = useStore((state) => state.role);

  return (
    <>
      {showNav && <Nav />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          {/* Redirect from root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" />} />

          {/* General Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients-history" element={<ClientsHistory />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/AllClients" element={<AllClients />} />
          <Route path="/xldata" element={<XLdata />} />
          <Route path="/time-insights" element={<TimeInsights />} />
          <Route path="/clientshistoryprofile/:id" element={<ClientsHistoryProfile />} />
          <Route path="/clients/:id" element={<ClientProfile />} />
          <Route path="/eclients/:id" element={<EClientProfile />} />
          <Route path="/allclients/:id" element={<AllClientProfile />} />
          <Route path="/site-visits/:id" element={<SiteVisitForm />} />
          <Route path="/fclients/:id" element={<FClientProfile />} />
          <Route path="/pd-kits" element={<AllPdKitsPage />} />

          {/* Role-specific Routes */}
          <Route
            path="/employees"
            element={
              <RoleBasedRoute requiredRoles={['head','e.head']}>
                <Employees />
              </RoleBasedRoute>
            }
          />

          <Route
            path="/site-visit"
            element={
              <RoleBasedRoute requiredRoles={['employee','e.employee']}>
                <SiteVisit />
              </RoleBasedRoute>
            }
          />

          <Route
            path="/eclients"
            element={
              <RoleBasedRoute requiredRoles={['e.head', 'e.employee']}>
                <EClients />
              </RoleBasedRoute>
            }
          />

          <Route
            path="/fclients"
            element={
              <RoleBasedRoute requiredRoles={['finance.employee']}>
                <FClients />
              </RoleBasedRoute>
            }
          />

          <Route
            path="/documents-upload"
            element={
              <RoleBasedRoute requiredRoles={['finance.employee']}>
                <DocumentsUpload />
              </RoleBasedRoute>
            }
          />
        </Route>

        {/* Catch-all for 404 */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </>
  );
}

export default App;