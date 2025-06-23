// src/router/AppRouter.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
// Import page components once they are created
// For now, using placeholders
const TimeClockingPagePlaceholder = React.lazy(() => import('../pages/TimeClockingPage'));
const ActivityTrackingPagePlaceholder = React.lazy(() => import('../pages/ActivityTrackingPage'));
const CoverageReportPagePlaceholder = React.lazy(() => import('../pages/CoverageReportPage')); 


/**
 * @function AppRouter
 * @description Defines the application's routing structure.
 * @returns {JSX.Element} The router component.
 */
const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route
            index
            element={
              <React.Suspense fallback={<div>Carregando Página de Ponto...</div>}>
                <TimeClockingPagePlaceholder />
              </React.Suspense>
            }
          />
          <Route
            path="activities"
            element={
              <React.Suspense fallback={<div>Carregando Página de Atividades...</div>}>
                <ActivityTrackingPagePlaceholder />
              </React.Suspense>
            }
          />
          <Route
            path="reports/coverage"
            element={
              <React.Suspense fallback={<div>Carregando Relatório...</div>}>
                <CoverageReportPagePlaceholder />
              </React.Suspense>
            }
          />
          {/* TODO: Add a 404 Not Found route */}
          {/* <Route path="*" element={<NotFoundPage />} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;