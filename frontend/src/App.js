import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Record from './pages/Record';
import Verify from './pages/Verify';
import Register from './pages/Register';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/record" element={<Record />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </Router>
  );
}

export default App;