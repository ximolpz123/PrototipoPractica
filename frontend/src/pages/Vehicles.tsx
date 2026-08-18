import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { IUser, IReservation, IVehicle } from '../types';

import camionetaBlancaImg from '../assets/camioneta-blanca.png'; // Fallback
import autoCafeImg from '../assets/auto-cafe.png';
import camionetaAzulImg from '../assets/camioneta-azul.png';
import logo from '../assets/bit-mejorado.png';
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
  const [activeTab, setActiveTab] = useState<'catalogo' | 'reservaciones' | 'perfil'>(initialTab);
  const [modalImg, setModalImg] = useState<string | null>(null);
  const [vehiclesList, setVehiclesList] = useState<IVehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [reservations, setReservations] = useState<IReservation[]>([]);
  const [loadingRes, setLoadingRes] = useState(false);
  const [errorRes, setErrorRes] = useState('');
  const [resFilterStatus, setResFilterStatus] = useState('todos');
  const [selectedReservation, setSelectedReservation] = useState<IReservation | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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

  const ESTADO_PRIORITY: Record<string, number> = {
    en_curso: 1,
    aprobada: 2,
    pendiente: 3,
    completada: 4,
    cancelada: 5,
  };

  const filteredReservations = reservations
    .filter((r) => resFilterStatus === 'todos' || r.estado === resFilterStatus)
    .sort((a, b) => {
      const pA = ESTADO_PRIORITY[a.estado] || 99;
      const pB = ESTADO_PRIORITY[b.estado] || 99;
      return pA - pB;
    });

  return (
    <div className="dashboard-layout">

      {/* ══════════ SIDEBAR AZUL ══════════ */}
      <aside className="dashboard-sidebar">

        {/* Logo */}
        <div style={{ textAlign: 'center', margin: '1rem 0' }}>
          <img src={logo} alt="Bitnets" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid black' }} />
        </div>

        {/* Bandera del usuario actual (esquina superior derecha del menú) */}
        {user && (
          <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 1001 }} title={`Tu bandera actual: ${user.rol === 'admin' ? 'verde' : 'amarilla'}`}>
            <span style={{
              display: 'inline-block', width: '16px', height: '16px', borderRadius: '50%',
              backgroundColor: user.rol === 'admin' ? '#22c55e' : '#eab308',
              border: '2px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.2)'
            }} />
          </div>
        )}

        <div className="sidebar-profile">
          <div className="sidebar-photo-upload" onClick={() => fileInputRef.current?.click()} title="Cambiar foto">
            <img src={profileImg} alt="Perfil" className="sidebar-profile-img" />
            <div className="sidebar-photo-overlay"></div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <div className="sidebar-profile-info">
            <span className="sidebar-profile-name">
              {user?.nombre ?? ''} {user?.apellido ?? ''} | <span title={`Departamento de ${user?.departamento || 'Sin Departamento'}`} style={{ fontWeight: 'normal', color: 'rgba(255,255,255,0.85)', fontSize: '14px', cursor: 'default' }}>{user?.departamento ? user.departamento.slice(0, 2) : 'Sin'}</span>
            </span>
            {user?.rol !== 'admin' && (
              <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.9)', textAlign: 'left' }}>
                <span><strong>Licencia:</strong> <span style={{ color: user?.licenciaAlDia === false ? '#ef4444' : '#4ade80', fontWeight: 'bold' }}>{user?.licenciaAlDia === false ? 'NO AL DÍA' : 'AL DÍA'}</span></span>
              </div>
            )}
          </div>
        </div>

        {/* Navegación en orden */}
        <div className="sidebar-nav">
          <button className={`sidebar-btn${activeTab === 'catalogo' ? ' active' : ''}`} onClick={() => setActiveTab('catalogo')}>
            <span className="btn-icon"></span> Vehículos
          </button>
          <button className={`sidebar-btn${activeTab === 'reservaciones' ? ' active' : ''}`} onClick={() => setActiveTab('reservaciones')}>
            <span className="btn-icon"></span> Mis Reservaciones
          </button>
        </div>

        {/* Acciones inferiores */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 12px', width: '100%', boxSizing: 'border-box', marginBottom: '16px' }}>
          <button
            onClick={() => setActiveTab('perfil')}
            style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'normal', fontSize: '14px', cursor: 'pointer', textDecoration: activeTab === 'perfil' ? 'underline' : 'none', padding: '4px' }}
          >
            Configuración de Perfil
          </button>
          <button
            onClick={() => { }}
            style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'normal', fontSize: '14px', cursor: 'pointer', padding: '4px' }}
          >
            Soporte Técnico
          </button>
          <button className="sidebar-logout-btn" onClick={() => setShowLogoutModal(true)}>
            Cerrar Sesión
          </button>
        </div>
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', rowGap: '0.75rem', columnGap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        <span><strong>Patente:</strong> {v.placa}</span>
                        <span><strong>Año:</strong> {v.anio}</span>
                        <span><strong>Color:</strong> {v.color}</span>
                        <span><strong>Km:</strong> {v.kilometraje.toLocaleString('es-CL')}</span>
                      </div>
                      {v.nivelBencina !== undefined && (
                        <div style={{ marginTop: '0.5rem', marginBottom: '0.2rem', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                            <strong>Bencina:</strong> <span>{v.nivelBencina}%</span>
                          </div>
                          <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: '4px', height: '6px' }}>
                            <div style={{ width: `${v.nivelBencina}%`, backgroundColor: v.nivelBencina > 50 ? '#10b981' : v.nivelBencina > 20 ? '#f59e0b' : '#ef4444', height: '100%', borderRadius: '4px' }} />
                          </div>
                        </div>
                      )}
                      {v.ultimoMantenimiento && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', color: '#555', marginTop: '4px' }}>
                          <strong>Último Mantenimiento:</strong>
                          <span>{new Date(v.ultimoMantenimiento).toLocaleString('es-CL')}</span>
                        </div>
                      )}
                    </div>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: ESTADO_COLORS[v.estado] || '#gray' }}
                    >
                      {ESTADO_LABELS[v.estado] || v.estado}
                    </span>
                    <div style={{ textAlign: 'center', marginTop: '15px' }}>
                      <button
                        id={`ver-vehiculo-${v._id}`}
                        className="btn"
                        style={{ margin: 0, padding: '10px 32px', fontSize: '1rem' }}
                        onClick={() => setModalImg(imgUrl)}
                      >
                        Ver Vehículo
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Panel: Reservaciones ── */}
        {activeTab === 'reservaciones' && (
          <div className="reservations-panel">
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', width: '100%', marginBottom: '1rem' }}>
              <button
                id="btn-crear-reservacion"
                className="btn btn-create"
                onClick={() => navigate('/reservations')}
                style={{ margin: 0, height: '44px', display: 'flex', alignItems: 'center' }}
              >
                ➕ Crear Reservación
              </button>

              <div className="filter-panel" style={{ flex: 'none', width: '240px', boxSizing: 'border-box' }}>
                <select className="reserv-input" style={{ width: '100%', boxSizing: 'border-box', height: '44px' }} value={resFilterStatus} onChange={e => setResFilterStatus(e.target.value)}>
                  <option value="todos">Todos los Estados</option>
                  <option value="en_curso">En Curso</option>
                  <option value="aprobada">Aprobada</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            </div>

            {loadingRes && <p className="res-status">Cargando reservaciones…</p>}
            {errorRes && <p className="res-status res-error">{errorRes}</p>}

            {!loadingRes && !errorRes && filteredReservations.length === 0 && (
              <p className="res-status">No se encontraron reservaciones.</p>
            )}

            <div className="reservations-list">
              {filteredReservations.map((r) => (
                <div key={r._id} className="reservation-card">
                  <div className="reservation-card-header">
                    <span className="res-vehicle-name"> {getVehicleName(r.vehiculo)}</span>
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
                    <span> <strong>Inicio:</strong> {new Date(r.fechaInicio).toLocaleDateString('es-CL')}</span>
                    <span> <strong>Fin:</strong> {new Date(r.fechaFin).toLocaleDateString('es-CL')}</span>
                    {r.destino && <span> <strong>Destino:</strong> {r.destino}</span>}
                    {r.motivo && <span> <strong>Motivo:</strong> {r.motivo}</span>}
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '15px' }}>
                    <button
                      className="btn"
                      style={{ margin: 0, padding: '8px 24px', fontSize: '0.95rem' }}
                      onClick={() => setSelectedReservation(r)}
                    >
                      Ver Reservación
                    </button>
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
            style={{ zIndex: 1100 }}
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

        {/* ── Panel: Perfil ── */}
        {activeTab === 'perfil' && (
          <div className="perfil-panel" style={{ padding: '2rem', borderRadius: '12px', boxShadow: 'var(--shadow)', maxWidth: '800px' }}>
            <h2 style={{ marginTop: 0, color: 'var(--text-h)', marginBottom: '1.5rem', fontSize: '1.8rem' }}>Configuración de Perfil</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', fontSize: '1.1rem' }}>
              <div>
                <p><strong>Nombre:</strong> {user?.nombre || '-'}</p>
                <p><strong>Apellido:</strong> {user?.apellido || '-'}</p>
                <p><strong>Email:</strong> {user?.email || '-'}</p>
                <p><strong>Teléfono:</strong> {user?.telefono || '-'}</p>
              </div>
              <div>
                <p><strong>Departamento:</strong> {user?.departamento || '-'}</p>
                <p><strong>Rol:</strong> {user?.rol === 'admin' ? 'Administrador' : 'Operaciones'}</p>
                <p><strong>Licencia:</strong> <span style={{ color: user?.licenciaAlDia === false ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{user?.licenciaAlDia === false ? 'No al día' : 'Al día'}</span></p>
                <p><strong>Estado:</strong> {user?.activo === false ? 'Inactivo' : 'Activo'}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal Reservación ── */}
        {selectedReservation && (
          <div
            className="modal-overlay"
            onClick={() => {
              setSelectedReservation(null);
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
                {selectedReservation.motivoRechazo && (
                  <p style={{ margin: 0, marginTop: '0.5rem', color: '#ef4444' }}>
                    <strong>Motivo del Rechazo:</strong> {selectedReservation.motivoRechazo}
                  </p>
                )}

                {selectedReservation.kmRetorno !== undefined && selectedReservation.kmRetorno !== null && (
                  <div className="km-retorno-box">
                    <p className="km-retorno-text">
                      <strong>Kilometraje de Retorno (IA):</strong> {selectedReservation.kmRetorno.toLocaleString('es-CL')} km
                    </p>
                  </div>
                )}

                {['aprobada', 'en_curso', 'completada'].includes(selectedReservation.estado) && selectedReservation.fotosSalida && selectedReservation.fotosSalida.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <strong>Fotos de Inicio del Viaje:</strong>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                      {selectedReservation.fotosSalida.map((foto, idx) => {
                        const PHOTO_LABELS = ['Frontal', 'Lateral Derecho', 'Lateral Izquierdo', 'Trasero', 'Tablero', 'Interior'];
                        const label = PHOTO_LABELS[idx] || `Extra ${idx + 1}`;
                        const imgSrc = foto.startsWith('http') ? foto : `http://localhost:5000${foto}`;
                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100px' }}>
                            <img src={imgSrc} alt={label} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ccc', cursor: 'pointer' }} onClick={() => setModalImg(imgSrc)} />
                            <span style={{ fontSize: '0.75rem', marginTop: '6px', color: '#555', textAlign: 'center', fontWeight: 'bold' }}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {['aprobada', 'en_curso', 'completada'].includes(selectedReservation.estado) && selectedReservation.fotosRetorno && selectedReservation.fotosRetorno.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <strong>Fotos de Fin del Viaje:</strong>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                      {selectedReservation.fotosRetorno.map((foto, idx) => {
                        const PHOTO_LABELS = ['Frontal', 'Lateral Derecho', 'Lateral Izquierdo', 'Trasero', 'Tablero', 'Interior'];
                        const label = PHOTO_LABELS[idx] || `Extra ${idx + 1}`;
                        const imgSrc = foto.startsWith('http') ? foto : `http://localhost:5000${foto}`;
                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100px' }}>
                            <img src={imgSrc} alt={label} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ccc', cursor: 'pointer' }} onClick={() => setModalImg(imgSrc)} />
                            <span style={{ fontSize: '0.75rem', marginTop: '6px', color: '#555', textAlign: 'center', fontWeight: 'bold' }}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Modal Logout ── */}
        {showLogoutModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowLogoutModal(false)}
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
              <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#000', fontSize: '1.5rem' }}>¿Seguro que quiere Cerrar Sesión?</h2>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  className="btn"
                  style={{ background: 'rgba(239, 68, 68, 0.75)', color: 'black', padding: '0.5rem 2rem', marginTop: 0 }}
                  onClick={() => {
                    localStorage.removeItem('token');
                    navigate('/login');
                  }}
                >
                  Sí
                </button>
                <button
                  className="btn"
                  style={{ background: '#478EC6', color: 'black', padding: '0.5rem 2rem', marginTop: 0 }}
                  onClick={() => setShowLogoutModal(false)}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Vehicles;
