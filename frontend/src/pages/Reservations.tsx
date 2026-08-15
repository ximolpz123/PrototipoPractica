import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { IUser, IVehicle } from '../types';

import camionetaBlancaImg from '../assets/camioneta-blanca.png';
import autoCafeImg from '../assets/auto-cafe.png';
import camionetaAzulImg from '../assets/camioneta-azul.png';
import logo from '../assets/bit-mejorado.png';
import camionetaRojaImg from '../assets/camioneta-roja.png';
import nissanVersaNegroImg from '../assets/nissan versa negro.png';
import toyotaHiluxBlancoImg from '../assets/toyota hilux srv blanco.png';
import toyotaHiluxPlataImg from '../assets/toyota hilux srv plata.png';
import vwAmarokBlancoImg from '../assets/volkswagen amarok blanco.png';
import vwAmarokGrisImg from '../assets/volkswagen amarok gris.png';

// ─── Helper: Asignar imagen respectiva según vehículo ────────────────────────
const getVehicleImage = (v: IVehicle): string => {
  if (v.imagenUrl) return v.imagenUrl;
  const marca = v.marca?.toLowerCase() || '';
  const modelo = v.modelo?.toLowerCase() || '';
  const color = v.color?.toLowerCase() || '';

  if (marca.includes('nissan') && modelo.includes('versa')) return nissanVersaNegroImg;
  if (marca.includes('toyota') && modelo.includes('hilux')) {
    if (color.includes('plata') || color.includes('gris')) return toyotaHiluxPlataImg;
    return toyotaHiluxBlancoImg;
  }
  if (marca.includes('volkswagen') && modelo.includes('amarok')) {
    if (color.includes('gris') || color.includes('plata')) return vwAmarokGrisImg;
    return vwAmarokBlancoImg;
  }
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

function Reservations() {
  const navigate = useNavigate();

  let user: IUser | null = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    /* ignore */
  }

  const defaultProfileImg = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
  const profileImgKey = user ? `profile_img_${user.id}` : 'profile_img_default';
  const [profileImg, setProfileImg] = useState<string>(
    localStorage.getItem(profileImgKey) || defaultProfileImg
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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

  const [vehiculoId, setVehiculoId] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [destino, setDestino] = useState('');
  const [motivo, setMotivo] = useState('');
  const [vehiculoError, setVehiculoError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  const [vehiclesList, setVehiclesList] = useState<IVehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  // Estado para la lista de vehículos

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

  const selectedVehicle = vehiclesList.find((v) => v._id === vehiculoId);

  const handleVehiculoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setVehiculoId(id);
    const v = vehiclesList.find((v) => v._id === id);
    setVehiculoError(!!v && v.estado !== 'disponible');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehiculoId || vehiculoError || !fechaInicio || !fechaFin || !destino) return;

    setLoading(true);
    setApiError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vehiculo: vehiculoId,
          fechaInicio,
          fechaFin,
          destino,
          motivo: motivo.trim() === '' ? '- - -' : motivo,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al crear la reservación');
      }

      setSuccess(true);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Error al crear la reservación');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/vehicles', { state: { tab: 'reservaciones' } });
  };

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
              {user?.nombre ?? ''} {user?.apellido ?? ''} | <span title={`Departamento de: ${user?.departamento || 'Sin Departamento'}`} style={{ fontWeight: 'normal', color: 'rgba(255,255,255,0.85)', fontSize: '14px', cursor: 'default' }}>{user?.departamento ? user.departamento.slice(0, 2) : 'Sin'}</span>
            </span>
            {user?.rol !== 'admin' && (
              <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.9)', textAlign: 'left', marginTop: '2px' }}>
                <span><strong>Licencia:</strong> <span style={{ color: user?.licenciaAlDia === false ? '#ef4444' : '#4ade80', fontWeight: 'bold' }}>{user?.licenciaAlDia === false ? 'NO AL DÍA' : 'AL DÍA'}</span></span>
              </div>
            )}
          </div>
        </div>

        {/* Cerrar sesión */}
        <div className="sidebar-logout">
          <button className="sidebar-logout-btn" onClick={() => setShowLogoutModal(true)}>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ══════════ CONTENIDO PRINCIPAL ══════════ */}
      <main className="dashboard-content">
        <div className="page" style={{ position: 'relative', width: '100%', boxSizing: 'border-box', padding: '2rem' }}>

          {success ? (
            <div className="reserv-form-panel" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto', marginTop: '3rem' }}>
              <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#22c55e', marginBottom: '1.5rem' }}>
                ¡Solicitud enviada correctamente!
              </p>
              <p style={{ color: '#555', marginBottom: '2rem' }}>
                Su solicitud ha sido enviada al administrador para su revisión.
              </p>
              <button className="btn" onClick={handleCancel} style={{ color: 'black' }}>
                Ver mis Reservaciones
              </button>
            </div>
          ) : (
            <>
              <h1 style={{ textAlign: 'center', marginTop: '3rem', marginBottom: '1.5rem', fontSize: '2rem', color: 'var(--text-h)' }}>
                Crear Nueva Reservación
              </h1>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '3rem', maxWidth: '1300px', margin: '0 auto', flexWrap: 'wrap' }}>
                <div className="filter-panel" style={{ padding: '2.5rem', borderRadius: '12px', width: '100%', flex: '1', minWidth: '400px', maxWidth: '900px', boxSizing: 'border-box' }}>
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                      <label className="reserv-label" style={{ fontWeight: '600', display: 'block', marginBottom: '0.2rem', textAlign: 'center' }}>Vehículo</label>
                      <select className="reserv-input" style={{ width: '100%', boxSizing: 'border-box', height: '36px', padding: '0.25rem 0.5rem' }} value={vehiculoId} onChange={handleVehiculoChange} disabled={loadingVehicles} required>
                        <option value="">{loadingVehicles ? 'Cargando vehículos...' : 'Seleccione un vehículo'}</option>
                        {vehiclesList.map(v => (
                          <option key={v._id} value={v._id}>{v.marca} {v.modelo} - Placa: {v.placa}</option>
                        ))}
                      </select>
                      {vehiculoError && <p className="reserv-field-error" style={{ marginBottom: '1rem', color: '#ef4444', textAlign: 'center', marginTop: '0.5rem' }}>⚠️ Este vehículo no está disponible.</p>}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label className="reserv-label" style={{ fontWeight: '600', display: 'block', marginBottom: '0.2rem', textAlign: 'center' }}>Fecha de Inicio</label>
                        <input type="datetime-local" className="reserv-input" style={{ width: '100%', boxSizing: 'border-box', height: '36px', padding: '0.25rem 0.5rem' }} value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} required />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="reserv-label" style={{ fontWeight: '600', display: 'block', marginBottom: '0.2rem', textAlign: 'center' }}>Fecha de Fin</label>
                        <input type="datetime-local" className="reserv-input" style={{ width: '100%', boxSizing: 'border-box', height: '36px', padding: '0.25rem 0.5rem' }} value={fechaFin} min={fechaInicio} onChange={e => setFechaFin(e.target.value)} required />
                      </div>
                    </div>

                    <div>
                      <label className="reserv-label" style={{ fontWeight: '600', display: 'block', marginBottom: '0.2rem', textAlign: 'center' }}>Destino</label>
                      <input type="text" className="reserv-input" style={{ width: '100%', boxSizing: 'border-box', height: '36px', padding: '0.25rem 0.5rem' }} value={destino} onChange={e => setDestino(e.target.value)} required placeholder="Ej: Santiago Centro" />
                    </div>

                    <div>
                      <label className="reserv-label" style={{ fontWeight: '600', display: 'block', marginBottom: '0.2rem', textAlign: 'center' }}>Motivo</label>
                      <textarea className="reserv-textarea" style={{ width: '100%', boxSizing: 'border-box', minHeight: '60px', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-p)' }} value={motivo} onChange={e => setMotivo(e.target.value)} required placeholder="Describa el motivo de uso..." />
                    </div>

                    {apiError && <p className="reserv-field-error" style={{ marginBottom: '1rem', color: '#ef4444', textAlign: 'center' }}>{apiError}</p>}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', justifyContent: 'center' }}>
                      <button type="submit" className="btn" disabled={loading || vehiculoError || !vehiculoId || !fechaInicio || !fechaFin || !destino} style={{ background: 'linear-gradient(to right, #3D9FD3, #FFFFFF, #B5B8BE)', color: 'black', border: '2px solid black', borderRadius: '8px', padding: '0.5rem 1rem', margin: 0, opacity: (loading || vehiculoError || !vehiculoId || !fechaInicio || !fechaFin || !destino) ? 0.5 : 1 }}>
                        {loading ? 'Creando...' : '➕ Crear Reservación'}
                      </button>
                      <button type="button" className="btn" onClick={handleCancel} style={{ background: 'rgba(239, 68, 68, 0.75)', color: 'black', border: '2px solid black', borderRadius: '8px', padding: '0.5rem 1rem', margin: 0 }}>Cancelar</button>
                    </div>
                  </form>
                </div>

                {selectedVehicle && !vehiculoError && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', border: '2px solid #ccc', borderRadius: '8px', padding: '1.5rem', backgroundColor: 'var(--bg-panel)', width: '400px', boxSizing: 'border-box', marginTop: '4.5rem' }}>
                    <img
                      src={getVehicleImage(selectedVehicle)}
                      alt={`${selectedVehicle.marca} ${selectedVehicle.modelo}`}
                      style={{ width: '100%', height: '260px', objectFit: 'cover', borderRadius: '6px' }}
                    />
                    <span style={{ color: '#22c55e', fontWeight: '600', marginTop: '1.5rem', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }}></span>
                      Disponible
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

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

export default Reservations;
