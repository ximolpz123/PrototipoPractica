import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { IUser, IReservation, IVehicle } from '../types';

import autoCafeImg from '../assets/auto-cafe.png';
import camionetaRojaImg from '../assets/camioneta-roja.png';
import camionetaAzulImg from '../assets/camioneta-azul.png';
import camionetaBlancaImg from '../assets/camioneta-blanca.png';

import UserProfileMenu from '../components/UserProfileMenu';

// ─── Datos fijos de los 4 vehículos ───────────────────────────────────────────
const VEHICLES: (IVehicle & { imagen: string; nombreDisplay: string })[] = [
  {
    _id: '1',
    nombreDisplay: 'Auto Café',
    imagen: autoCafeImg,
    placa: 'ABC-1234',
    marca: 'Toyota',
    modelo: 'Corolla',
    anio: 2020,
    color: 'Café',
    tipo: 'sedan',
    estado: 'disponible',
    kilometraje: 32000,
    createdAt: '',
    updatedAt: '',
  },
  {
    _id: '2',
    nombreDisplay: 'Camioneta Roja',
    imagen: camionetaRojaImg,
    placa: 'DEF-5678',
    marca: 'Ford',
    modelo: 'Ranger',
    anio: 2021,
    color: 'Rojo',
    tipo: 'pickup',
    estado: 'reservado',
    kilometraje: 18500,
    createdAt: '',
    updatedAt: '',
  },
  {
    _id: '3',
    nombreDisplay: 'Camioneta Azul',
    imagen: camionetaAzulImg,
    placa: 'GHI-9012',
    marca: 'Chevrolet',
    modelo: 'Silverado',
    anio: 2019,
    color: 'Azul',
    tipo: 'pickup',
    estado: 'mantenimiento',
    kilometraje: 55200,
    createdAt: '',
    updatedAt: '',
  },
  {
    _id: '4',
    nombreDisplay: 'Camioneta Blanca',
    imagen: camionetaBlancaImg,
    placa: 'JKL-3456',
    marca: 'Nissan',
    modelo: 'Frontier',
    anio: 2022,
    color: 'Blanco',
    tipo: 'pickup',
    estado: 'fuera_de_servicio',
    kilometraje: 8900,
    createdAt: '',
    updatedAt: '',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ESTADO_LABELS: Record<string, string> = {
  disponible: 'Disponible',
  reservado: 'Reservado',
  mantenimiento: 'Mantenimiento',
  fuera_de_servicio: 'Fuera de Servicio',
};

const ESTADO_COLORS: Record<string, string> = {
  disponible: '#22c55e',
  reservado: '#f59e0b',
  mantenimiento: '#3b82f6',
  fuera_de_servicio: '#ef4444',
};

// ─── Componente ───────────────────────────────────────────────────────────────
function Vehicles() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'catalogo' | 'reservaciones'>('catalogo');
  const [modalImg, setModalImg] = useState<string | null>(null);
  const [reservations, setReservations] = useState<IReservation[]>([]);
  const [loadingRes, setLoadingRes] = useState(false);
  const [errorRes, setErrorRes] = useState('');

  // Leer usuario del localStorage
  const storedUser = localStorage.getItem('user');
  const user: IUser | null = storedUser ? JSON.parse(storedUser) : null;

  // Cargar reservaciones cuando se cambia a la pestaña
  useEffect(() => {
    if (activeTab !== 'reservaciones') return;
    setLoadingRes(true);
    setErrorRes('');
    const token = localStorage.getItem('token');
    fetch('http://localhost:5000/api/reservations', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setReservations(data);
        else setReservations([]);
      })
      .catch(() => setErrorRes('Error al cargar reservaciones'))
      .finally(() => setLoadingRes(false));
  }, [activeTab]);

  // ─── Obtener nombre del vehículo de una reservación ───
  const getVehicleName = (vehiculo: IVehicle | string) => {
    if (typeof vehiculo === 'object' && vehiculo !== null) {
      const found = VEHICLES.find((v) => v.marca === vehiculo.marca && v.modelo === vehiculo.modelo);
      return found ? found.nombreDisplay : `${vehiculo.marca} ${vehiculo.modelo}`;
    }
    const found = VEHICLES.find((v) => v._id === vehiculo);
    return found ? found.nombreDisplay : `Vehículo #${vehiculo}`;
  };

  return (
    <div className="user-panel">
      <UserProfileMenu />
      {/* ── Bienvenida ── */}
      <div className="welcome-header">
        <span className="welcome-text">
          ¡Bienvenido! {user?.nombre ?? ''} {user?.apellido ?? ''} 😊
        </span>
      </div>

      {/* ── Tabs ── */}
      <div className="panel-tabs">
        <button
          id="tab-catalogo"
          className={`tab-btn${activeTab === 'catalogo' ? ' active' : ''}`}
          onClick={() => setActiveTab('catalogo')}
        >
          🚗 Catálogo de Vehículos
        </button>
        <button
          id="tab-reservaciones"
          className={`tab-btn${activeTab === 'reservaciones' ? ' active' : ''}`}
          onClick={() => setActiveTab('reservaciones')}
        >
          📋 Mis Reservaciones
        </button>
      </div>

      {/* ── Panel: Catálogo ── */}
      {activeTab === 'catalogo' && (
        <div className="vehicles-grid">
          {VEHICLES.map((v) => (
            <div key={v._id} className="vehicle-card">
              <img
                src={v.imagen}
                alt={v.nombreDisplay}
                className="vehicle-card-img"
              />
              <div className="vehicle-card-body">
                <h2 className="vehicle-card-title">{v.nombreDisplay}</h2>
                <div className="vehicle-card-info">
                  <span><strong>Patente:</strong> {v.placa}</span>
                  <span><strong>Marca:</strong> {v.marca}</span>
                  <span><strong>Modelo:</strong> {v.modelo}</span>
                </div>
                <span
                  className="status-badge"
                  style={{ backgroundColor: ESTADO_COLORS[v.estado] }}
                >
                  {ESTADO_LABELS[v.estado]}
                </span>
                <button
                  id={`ver-vehiculo-${v._id}`}
                  className="btn btn-sm"
                  onClick={() => setModalImg(v.imagen)}
                >
                  🔍 Ver Vehículo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Panel: Reservaciones ── */}
      {activeTab === 'reservaciones' && (
        <div className="reservations-panel">
          <button
            id="btn-crear-reservacion"
            className="btn btn-create"
            onClick={() => navigate('/reservations')}
          >
            ➕ Crear Reservación
          </button>

          {loadingRes && <p className="res-status">Cargando reservaciones…</p>}
          {errorRes && <p className="res-status res-error">{errorRes}</p>}

          {!loadingRes && !errorRes && reservations.length === 0 && (
            <p className="res-status">No tienes reservaciones aún.</p>
          )}

          <div className="reservations-list">
            {reservations.map((r) => (
              <div key={r._id} className="reservation-card">
                <div className="reservation-card-header">
                  <span className="res-vehicle-name">🚗 {getVehicleName(r.vehiculo)}</span>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor:
                        r.estado === 'aprobada' ? '#22c55e' :
                        r.estado === 'pendiente' ? '#f59e0b' :
                        r.estado === 'en_curso' ? '#3b82f6' :
                        r.estado === 'completada' ? '#8b5cf6' : '#ef4444',
                    }}
                  >
                    {r.estado.charAt(0).toUpperCase() + r.estado.slice(1).replace('_', ' ')}
                  </span>
                </div>
                <div className="reservation-card-info">
                  <span>📅 <strong>Inicio:</strong> {new Date(r.fechaInicio).toLocaleDateString('es-CL')}</span>
                  <span>📅 <strong>Fin:</strong> {new Date(r.fechaFin).toLocaleDateString('es-CL')}</span>
                  {r.destino && <span>📍 <strong>Destino:</strong> {r.destino}</span>}
                  {r.motivo && <span>📝 <strong>Motivo:</strong> {r.motivo}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal imagen ── */}
      {modalImg && (
        <div
          id="modal-overlay"
          className="modal-overlay"
          onClick={() => setModalImg(null)}
        >
          <img
            src={modalImg}
            alt="Vista ampliada"
            className="modal-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default Vehicles;
