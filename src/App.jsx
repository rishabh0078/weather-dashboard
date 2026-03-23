import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LocationProvider } from './context/LocationContext';
import Navbar from './components/Navbar';

// Lazy load pages for code splitting to shrink initial bundle
const CurrentWeather = lazy(() => import('./pages/CurrentWeather'));
const HistoricalWeather = lazy(() => import('./pages/HistoricalWeather'));

// A sleek fallback explicitly for page transitions
function PageFallback() {
  return (
    <div className="loading-screen" style={{ minHeight: '60vh' }}>
      <div className="loading-spinner" />
    </div>
  );
}

export default function App() {
  return (
    <LocationProvider>
      <BrowserRouter>
        <div className="app-layout">
          <Navbar />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<CurrentWeather />} />
              <Route path="/historical" element={<HistoricalWeather />} />
            </Routes>
          </Suspense>
        </div>
      </BrowserRouter>
    </LocationProvider>
  );
}
