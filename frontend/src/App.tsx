import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reservations from './pages/Reservations';
import Vehicles from './pages/Vehicles';
import ThemeToggle from './components/ThemeToggle';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <ThemeToggle />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/vehicles" element={<Vehicles />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
