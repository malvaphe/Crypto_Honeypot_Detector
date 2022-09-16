// Main
import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import './css/style.scss';
import AOS from 'aos';

// Pages
import HoneypotDetector from './pages/HoneypotDetector';

function App() {
  const location = useLocation();

  // Effects
  useEffect(() => {
    AOS.init({
      once: true,
      disable: 'phone',
      duration: 700,
      easing: 'ease-out-cubic',
    });
  });
  useEffect(() => {
    document.querySelector('html').style.scrollBehavior = 'auto';
    window.scroll({ top: 0 });
    document.querySelector('html').style.scrollBehavior = '';
  }, [location.pathname]);

  return (
    <>
      <Routes>
        <Route path='/' element={<HoneypotDetector />} />
      </Routes>
    </>
  );
}

export default App;
