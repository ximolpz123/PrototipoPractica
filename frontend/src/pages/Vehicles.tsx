import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { IUser, IReservation, IVehicle } from '../types';

import camionetaBlancaImg from '../assets/camioneta-blanca.png'; // Fallback
import autoCafeImg from '../assets/auto-cafe.png';
import camionetaAzulImg from '../assets/camioneta-azul.png';
import camionetaRojaImg from '../assets/camioneta-roja.png';
import nissanVersaNegroImg from '../assets/nissan versa negro.png';
import toyotaHiluxBlancoImg from '../assets/toyota hilux srv blanco.png';
import toyotaHiluxPlataImg from '../assets/toyota hilux srv plata.png';
import vwAmarokBlancoImg from '../assets/volkswagen amarok blanco.png';
import vwAmarokGrisImg from '../assets/volkswagen amarok gris.png';

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

// ─── Helper: Asignar imagen respectiva según vehículo ────────────────────────
const getVehicleImage = (v: IVehicle): string => {
  if (v.imagenUrl) return v.imagenUrl;

  const marca = v.marca?.toLowerCase() || '';
  const modelo = v.modelo?.toLowerCase() || '';
  const color = v.color?.toLowerCase() || '';

  if (marca.includes('nissan') && modelo.includes('versa')) return nissanVersaNegroImg;
  if (marca.includes('toyota') && modelo.includes('hilux')) {
    if (color.includes('plata') || color.includes('gris')) return toyotaHiluxPlataImg;
    return toyotaHiluxBlancoImg; // Fallback para hilux
  }
  if (marca.includes('volkswagen') && modelo.includes('amarok')) {
    if (color.includes('gris') || color.includes('plata')) return vwAmarokGrisImg;
    return vwAmarokBlancoImg; // Fallback para amarok
  }

  // Fallbacks genéricos
  if (v.tipo === 'pickup') {
    if (color.includes('azul')) return camionetaAzulImg;
    if (color.includes('roj')) return camionetaRojaImg;
    return camionetaBlancaImg;
  }
  if (v.tipo === 'sedan') {
    if (color.includes('cafe') || color.includes('café') || color.includes('marr')) return autoCafeImg;
  }

  return camionetaBlancaImg;
};

// ─── Componente ───────────────────────────────────────────────────────────────
function Vehicles() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialTab = (location.state as { tab?: string })?.tab === 'reservaciones' ? 'reservaciones' : 'catalogo';
  const [activeTab, setActiveTab] = useState<'catalogo' | 'reservaciones'>(initialTab);
  const [modalImg, setModalImg] = useState<string | null>(null);
  const [vehiclesList, setVehiclesList] = useState<IVehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [reservations, setReservations] = useState<IReservation[]>([]);
  const [loadingRes, setLoadingRes] = useState(false);
  const [errorRes, setErrorRes] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<IReservation | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Leer usuario del localStorage
  const storedUser = localStorage.getItem('user');
  const user: IUser | null = storedUser ? JSON.parse(storedUser) : null;

  const defaultProfileImg = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
  const profileImgKey = user ? `profile_img_${user.id}` : 'profile_img_default';
  const [profileImg, setProfileImg] = useState<string>(
    localStorage.getItem(profileImgKey) || defaultProfileImg
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProfileImg(result);
        localStorage.setItem(profileImgKey, result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Cargar vehículos al montar
  useEffect(() => {
    setLoadingVehicles(true);
    const token = localStorage.getItem('token');
    fetch('http://localhost:5000/api/vehicles', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setVehiclesList(data);
      })
      .catch((err) => console.error('Error cargando vehículos', err))
      .finally(() => setLoadingVehicles(false));
  }, []);

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
      return `${vehiculo.marca} ${vehiculo.modelo}`;
    }
    const found = vehiclesList.find((v) => v._id === vehiculo);
    return found ? `${found.marca} ${found.modelo}` : `Vehículo #${vehiculo}`;
  };

  const handleDeleteReservation = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/reservations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setReservations((prev) => prev.filter((r) => r._id !== id));
      setSelectedReservation(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error al eliminar reservación', error);
    }
  };

  return (
    <div className="dashboard-layout">
      
      {/* ══════════ SIDEBAR AZUL ══════════ */}
      <aside className="dashboard-sidebar">
        
        {/* Perfil */}
        <div className="sidebar-profile">
          <div className="sidebar-photo-upload" onClick={() => fileInputRef.current?.click()} title="Cambiar foto">
            <img src={profileImg} alt="Perfil" className="sidebar-profile-img" />
            <div className="sidebar-photo-overlay">📷</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <span className="sidebar-profile-name">
            {user?.nombre ?? ''} {user?.apellido ?? ''}
          </span>
          <span className="sidebar-profile-role">
            {user?.rol === 'admin' ? 'Administrador' : 'Conductor'}
          </span>
        </div>

        {/* Navegación en orden */}
        <div className="sidebar-nav">
          <button className={`sidebar-btn${activeTab === 'catalogo' ? ' active' : ''}`} onClick={() => setActiveTab('catalogo')}>
            <span className="btn-icon">🚗</span> Ver Vehículos
          </button>
          <button className={`sidebar-btn${activeTab === 'reservaciones' ? ' active' : ''}`} onClick={() => setActiveTab('reservaciones')}>
            <span className="btn-icon">📋</span> Mis Reservaciones
          </button>
        </div>

        {/* Logout bottom */}
        <button className="sidebar-btn sidebar-logout" onClick={() => {
          localStorage.removeItem('token');
          navigate('/login');
        }}>
          <span className="btn-icon">🚪</span> Cerrar Sesión
        </button>
      </aside>

      {/* ══════════ MAIN CONTENT ══════════ */}
      <main className="dashboard-content">
        
        {/* ── Bienvenida ── */}
        <div className="welcome-header" style={{ maxWidth: '100%' }}>
          <span className="welcome-text">
            ¡Bienvenido! {user?.nombre ?? ''} {user?.apellido ?? ''}
          </span>
        </div>

      {/* ── Panel: Catálogo ── */}
      {activeTab === 'catalogo' && (
        <div className="vehicles-grid">
          {loadingVehicles && <p style={{ textAlign: 'center', width: '100%' }}>Cargando vehículos...</p>}
          {!loadingVehicles && vehiclesList.map((v) => {
            const imgUrl = getVehicleImage(v);
            return (
              <div key={v._id} className="vehicle-card">
                <img
                  src={imgUrl}
                  alt={`${v.marca} ${v.modelo}`}
                  className="vehicle-card-img"
                />
                <div className="vehicle-card-body">
                  <h2 className="vehicle-card-title">{v.marca} {v.modelo}</h2>
                  <div className="vehicle-card-info">
                    <span><strong>Patente:</strong> {v.placa}</span>
                    <span><strong>Año:</strong> {v.anio}</span>
                    <span><strong>Color:</strong> {v.color}</span>
                    <span><strong>Kilometraje:</strong> {v.kilometraje} km</span>
                    {v.ultimoMantenimiento && (
                      <span style={{ fontSize: '0.9rem', color: '#555', marginTop: '4px', display: 'block' }}>
                        <strong>Último Mantenimiento:</strong><br />
                        {new Date(v.ultimoMantenimiento).toLocaleString('es-CL')}
                      </span>
                    )}
                  </div>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: ESTADO_COLORS[v.estado] || '#gray' }}
                  >
                    {ESTADO_LABELS[v.estado] || v.estado}
                  </span>
                  <button
                    id={`ver-vehiculo-${v._id}`}
                    className="btn btn-sm"
                    style={{ marginTop: '10px' }}
                    onClick={() => setModalImg(imgUrl)}
                  >
                    🔍 Ver Vehículo
                  </button>
                </div>
              </div>
            );
          })}
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
            <p className="res-status">No tiene ninguna reservación</p>
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
                <button
                  className="btn"
                  style={{ marginTop: '1rem', width: '100%' }}
                  onClick={() => setSelectedReservation(r)}
                >
                  Ver Reservación
                </button>
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

      {/* ── Modal Reservación ── */}
      {selectedReservation && (
        <div
          className="modal-overlay"
          onClick={() => {
            setSelectedReservation(null);
            setShowDeleteConfirm(false);
          }}
        >
          <div
            className="modal-content"
            style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
              color: '#000',
              textAlign: 'center',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setSelectedReservation(null);
                setShowDeleteConfirm(false);
              }}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: '#e5e7eb',
                color: '#000',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
            >
              X
            </button>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#000' }}>Detalles de Reservación</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', textAlign: 'left', fontSize: '1.1rem' }}>
              <p style={{ margin: 0 }}><strong>Tipo de vehículo:</strong> {getVehicleName(selectedReservation.vehiculo)}</p>
              <p style={{ margin: 0 }}><strong>Estado:</strong> {selectedReservation.estado.charAt(0).toUpperCase() + selectedReservation.estado.slice(1).replace('_', ' ')}</p>
              <p style={{ margin: 0 }}><strong>Inicio:</strong> {new Date(selectedReservation.fechaInicio).toLocaleString('es-CL')}</p>
              <p style={{ margin: 0 }}><strong>Fin:</strong> {new Date(selectedReservation.fechaFin).toLocaleString('es-CL')}</p>
              {selectedReservation.destino && <p style={{ margin: 0 }}><strong>Destino:</strong> {selectedReservation.destino}</p>}
              {selectedReservation.motivo && <p style={{ margin: 0 }}><strong>Motivo:</strong> {selectedReservation.motivo}</p>}
            </div>

            {showDeleteConfirm ? (
              <div style={{ borderTop: '1px solid #ccc', paddingTop: '1.5rem' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '1.5rem', fontSize: '1.2rem', color: '#000' }}>¿Quiere eliminar esta Reservación?</p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    className="btn"
                    style={{ backgroundColor: 'red', color: 'black', padding: '0.5rem 2rem' }}
                    onClick={() => handleDeleteReservation(selectedReservation._id)}
                  >
                    Si
                  </button>
                  <button
                    className="btn"
                    style={{ backgroundColor: '#175fbd', color: 'black', padding: '0.5rem 2rem' }}
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    No
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  className="btn"
                  style={{ backgroundColor: 'red', color: 'black' }}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Eliminar Reservación
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

export default Vehicles;
