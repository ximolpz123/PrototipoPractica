import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="page">
      <h1>🚗 Sistema de Reserva de Vehículos</h1>
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
