import { Link } from 'react-router-dom';
import logo from '../assets/bit-mejorado.png';

function Home() {
  return (
    <div className="page">
      <div className="logo-container">
        <img src={logo} alt="Bitnets" className="logo-img" />
        <span className="logo-text">Bitnets</span>
      </div>
      <h1>Bienvenido a la Reservación de Vehículos</h1>
      <p>Gestiona las reservas de vehículos de la empresa de forma rápida y sencilla.</p>
      <div className="home-actions">
        <Link to="/login" className="btn btn-primary">
          Iniciar Sesión
        </Link>
      </div>
    </div>
  );
}

export default Home;
