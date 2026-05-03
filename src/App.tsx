/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import ProcessingPage from './pages/ProcessingPage';
import ResultsPage from './pages/ResultsPage';
import HistoryPage from './pages/HistoryPage';
import SplashScreen from './components/SplashScreen';
import { AnimatePresence } from 'motion/react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  
  return <Layout>{children}</Layout>;
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); // 2.5 seconds splash
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthProvider>
      <AnimatePresence>
        {showSplash && <SplashScreen />}
      </AnimatePresence>
      {!showSplash && (
        <Router>
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/processing" 
              element={
                <ProtectedRoute>
                  <ProcessingPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/results/:id" 
              element={
                <ProtectedRoute>
                  <ResultsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/history" 
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      )}
    </AuthProvider>
  );
}
