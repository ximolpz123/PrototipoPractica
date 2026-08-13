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
              {user?.nombre ?? ''} {user?.apellido ?? ''} | <span title={`Departamento de: ${user?.departamento || 'Sin Departamento'}`} style={{ fontWeight: 'normal', color: 'rgba(255,255,255,0.85)', fontSize: '14px', cursor: 'default' }}>{user?.departamento || 'Sin Departamento'}</span>
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

          <h1 style={{ textAlign: 'center', marginTop: '3rem', marginBottom: '1.5rem', fontSize: '2rem', color: '#000' }}>
            Cree su Reservación
          </h1>

          {success ? (
            <div className="reserv-form-panel" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
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
            <form className="reserv-form-panel" onSubmit={handleSubmit}>

              {/* ── Vehículo ── */}
              <div className="reserv-form-row">
                <label className="reserv-label" htmlFor="vehiculo-select">
                  Elija el tipo de Vehículo
                </label>
                <div style={{ flex: 1 }}>
                  <select
                    id="vehiculo-select"
                    className={`reserv-select${vehiculoError ? ' reserv-select-error' : ''}`}
                    value={vehiculoId}
                    onChange={handleVehiculoChange}
                    disabled={loadingVehicles}
                    required
                  >
                    <option value="">{loadingVehicles ? 'Cargando vehículos...' : '— Seleccione un vehículo —'}</option>
                    {vehiclesList.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.marca} {v.modelo} - Placa: {v.placa} ({v.estado.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                  {vehiculoError && (
                    <p className="reserv-field-error">
                      ⚠️ Este vehículo no está disponible. Por favor seleccione otro.
                    </p>
                  )}
                  {selectedVehicle && !vehiculoError && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <img
                        src={getVehicleImage(selectedVehicle)}
                        alt={`${selectedVehicle.marca} ${selectedVehicle.modelo}`}
                        style={{ width: '80px', height: '55px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd' }}
                      />
                      <span style={{ color: '#22c55e', fontWeight: '600' }}>✔ Disponible</span>
                    </div>
                  )}
                </div>
              </div>

              <hr className="reserv-divider" />

              {/* ── Fechas ── */}
              <div className="reserv-form-row">
                <label className="reserv-label">Seleccione una Fecha</label>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <label style={{ fontWeight: '600', minWidth: '80px', color: '#333' }}>Inicio:</label>
                    <input
                      id="fecha-inicio"
                      type="datetime-local"
                      className="reserv-input"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      required
                      style={{ textAlign: 'center' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <label style={{ fontWeight: '600', minWidth: '80px', color: '#333' }}>Fin:</label>
                    <input
                      id="fecha-fin"
                      type="datetime-local"
                      className="reserv-input"
                      value={fechaFin}
                      min={fechaInicio}
                      onChange={(e) => setFechaFin(e.target.value)}
                      required
                      style={{ textAlign: 'center' }}
                    />
                  </div>
                </div>
              </div>

              <hr className="reserv-divider" />

              {/* ── Destino ── */}
              <div className="reserv-form-row">
                <label className="reserv-label" htmlFor="destino-input">
                  Su Destino
                </label>
                <input
                  id="destino-input"
                  type="text"
                  className="reserv-input"
                  placeholder="Ej: Planta Norte, Santiago..."
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  required
                  style={{ flex: 1 }}
                />
              </div>

              <hr className="reserv-divider" />

              {/* ── Motivo ── */}
              <div className="reserv-form-row" style={{ alignItems: 'flex-start' }}>
                <label className="reserv-label" style={{ paddingTop: '0.5rem' }}>
                  El Motivo<br />
                </label>
                <textarea
                  id="motivo-textarea"
                  className="reserv-textarea"
                  placeholder="Describa brevemente el motivo del viaje..."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={4}
                />
              </div>

              {apiError && (
                <p className="reserv-field-error" style={{ textAlign: 'center' }}>
                  ⚠️ {apiError}
                </p>
              )}

              {/* ── Botones ── */}
              <div className="reserv-form-actions">
                <button
                  id="btn-crear-reservacion"
                  type="submit"
                  className="btn"
                  disabled={loading || vehiculoError || !vehiculoId || !fechaInicio || !fechaFin || !destino}
                  style={{ backgroundColor: '#175fbd', color: 'black', opacity: (loading || vehiculoError || !vehiculoId || !fechaInicio || !fechaFin || !destino) ? 0.5 : 1 }}
                >
                  {loading ? 'Enviando…' : ' Crear la Reservación'}
                </button>
                <button
                  id="btn-cancelar-reservacion"
                  type="button"
                  className="btn"
                  onClick={handleCancel}
                  style={{ background: 'rgba(239, 68, 68, 0.75)', color: 'white', border: '2px solid #000000', borderRadius: '10px', fontWeight: '700' }}
                >
                  Cancelar
                </button>
              </div>
            </form>
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
                maxWidth: '400px',
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
