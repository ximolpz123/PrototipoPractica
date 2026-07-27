import { useState, useEffect } from 'react';
import UserProfileMenu from '../components/UserProfileMenu';
import type { IUser, IReservation, IVehicle } from '../types';
import camionetaBlancaImg from '../assets/camioneta-blanca.png'; // Fallback imagen

// ─── Helpers de colores/etiquetas ────────────────────────────────────────────
const ESTADO_VEHICLE_COLORS: Record<string, string> = {
  disponible: '#22c55e',
  reservado: '#f59e0b',
  mantenimiento: '#3b82f6',
  fuera_de_servicio: '#ef4444',
};
const ESTADO_VEHICLE_LABELS: Record<string, string> = {
  disponible: 'Disponible',
  reservado: 'Reservado',
  mantenimiento: 'Mantenimiento',
  fuera_de_servicio: 'Fuera de Servicio',
};
const ESTADO_RES_COLORS: Record<string, string> = {
  aprobada: '#22c55e',
  pendiente: '#f59e0b',
  en_curso: '#3b82f6',
  completada: '#8b5cf6',
  cancelada: '#ef4444',
};

type DashTab = 'usuarios' | 'reservaciones' | 'vehiculos';

// ─── Formulario vacío de vehículo ────────────────────────────────────────────
const EMPTY_VEHICLE_FORM = {
  placa: '',
  marca: '',
  modelo: '',
  anio: new Date().getFullYear(),
  color: '',
  tipo: 'pickup' as IVehicle['tipo'],
  estado: 'disponible' as IVehicle['estado'],
  kilometraje: 0,
  ultimoMantenimiento: '',
  imagenUrl: '',
};

// ─── Componente principal ────────────────────────────────────────────────────
function Dashboard() {
  const storedUser = localStorage.getItem('user');
  const user: IUser | null = storedUser ? JSON.parse(storedUser) : null;
  const token = localStorage.getItem('token');

  const [activeTab, setActiveTab] = useState<DashTab>('usuarios');

  // ── Estado Usuarios ──
  const [users, setUsers] = useState<IUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState('');
  const [editUser, setEditUser] = useState<IUser | null>(null);
  const [editForm, setEditForm] = useState({ nombre: '', apellido: '', email: '', departamento: '', rol: 'usuario' as 'usuario' | 'admin', activo: true });
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createForm, setCreateForm] = useState({ nombre: '', apellido: '', email: '', password: '', departamento: '', rol: 'usuario' as 'usuario' | 'admin' });

  // ── Estado Reservaciones ──
  const [reservations, setReservations] = useState<IReservation[]>([]);
  const [loadingRes, setLoadingRes] = useState(false);
  const [errorRes, setErrorRes] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<IReservation | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // ── Estado Vehículos ──
  const [vehicles, setVehicles] = useState<IVehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<IVehicle | null>(null);
  const [showDeleteVehicleConfirm, setShowDeleteVehicleConfirm] = useState<string | null>(null);
  const [showCreateVehicle, setShowCreateVehicle] = useState(false);
  const [showEditVehicle, setShowEditVehicle] = useState<IVehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE_FORM);

  // ── Cargar datos al cambiar tab ──
  useEffect(() => {
    if (activeTab === 'usuarios') fetchUsers();
    if (activeTab === 'reservaciones') fetchReservations();
    if (activeTab === 'vehiculos') fetchVehicles();
  }, [activeTab]);

  // ────────── FETCH FUNCTIONS ──────────
  const fetchUsers = async () => {
    setLoadingUsers(true); setErrorUsers('');
    try {
      const res = await fetch('http://localhost:5000/api/users', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch { setErrorUsers('Error al cargar usuarios'); }
    finally { setLoadingUsers(false); }
  };

  const fetchReservations = async () => {
    setLoadingRes(true); setErrorRes('');
    try {
      const res = await fetch('http://localhost:5000/api/reservations', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setReservations(Array.isArray(data) ? data : []);
    } catch { setErrorRes('Error al cargar reservaciones'); }
    finally { setLoadingRes(false); }
  };

  const fetchVehicles = async () => {
    setLoadingVehicles(true);
    try {
      const res = await fetch('http://localhost:5000/api/vehicles', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setVehicles(Array.isArray(data) ? data : []);
    } catch { console.error('Error cargando vehículos'); }
    finally { setLoadingVehicles(false); }
  };

  // ────────── CRUD USUARIOS ──────────
  const openEdit = (u: IUser) => {
    setEditUser(u);
    setEditForm({ nombre: u.nombre, apellido: u.apellido, email: u.email, departamento: u.departamento, rol: u.rol, activo: u.activo });
  };

  const saveEdit = async () => {
    if (!editUser) return;
    try {
      await fetch(`http://localhost:5000/api/users/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      });
      setEditUser(null);
      fetchUsers();
    } catch { alert('Error al actualizar usuario'); }
  };

  const deleteUser = async (id: string) => {
    try {
      await fetch(`http://localhost:5000/api/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setShowDeleteUserConfirm(null);
      fetchUsers();
    } catch { alert('Error al eliminar usuario'); }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(createForm),
      });
      setShowCreateUser(false);
      setCreateForm({ nombre: '', apellido: '', email: '', password: '', departamento: '', rol: 'usuario' });
      fetchUsers();
    } catch { alert('Error al crear usuario'); }
  };

  // ────────── CRUD VEHÍCULOS ──────────
  const createVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = { ...vehicleForm, ultimoMantenimiento: vehicleForm.ultimoMantenimiento || undefined };
      await fetch('http://localhost:5000/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      setShowCreateVehicle(false);
      setVehicleForm(EMPTY_VEHICLE_FORM);
      fetchVehicles();
    } catch { alert('Error al crear vehículo'); }
  };

  const openEditVehicle = (v: IVehicle) => {
    setShowEditVehicle(v);
    setSelectedVehicle(null);
    setVehicleForm({
      placa: v.placa,
      marca: v.marca,
      modelo: v.modelo,
      anio: v.anio,
      color: v.color,
      tipo: v.tipo,
      estado: v.estado,
      kilometraje: v.kilometraje,
      ultimoMantenimiento: v.ultimoMantenimiento ? new Date(v.ultimoMantenimiento).toISOString().slice(0, 16) : '',
      imagenUrl: v.imagenUrl ?? '',
    });
  };

  const saveEditVehicle = async () => {
    if (!showEditVehicle) return;
    try {
      const body = { ...vehicleForm, ultimoMantenimiento: vehicleForm.ultimoMantenimiento || undefined };
      await fetch(`http://localhost:5000/api/vehicles/${showEditVehicle._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      setShowEditVehicle(null);
      setVehicleForm(EMPTY_VEHICLE_FORM);
      fetchVehicles();
    } catch { alert('Error al actualizar vehículo'); }
  };

  const deleteVehicle = async (id: string) => {
    try {
      await fetch(`http://localhost:5000/api/vehicles/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setShowDeleteVehicleConfirm(null);
      setSelectedVehicle(null);
      fetchVehicles();
    } catch { alert('Error al eliminar vehículo'); }
  };

  // ── Aprobar Reservación ──
  const approveReservation = async (id: string) => {
    setApprovingId(id);
    try {
      await fetch(`http://localhost:5000/api/reservations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado: 'aprobada' }),
      });
      await fetchReservations();
      setSelectedReservation(prev => prev && prev._id === id ? { ...prev, estado: 'aprobada' } : prev);
    } catch { alert('Error al aprobar reservación'); }
    finally { setApprovingId(null); }
  };

  // ────────── Helper nombre vehículo en reservaciones ──────────
  const getVehicleName = (vehiculo: IReservation['vehiculo']) => {
    if (typeof vehiculo === 'object' && vehiculo !== null) {
      return `${(vehiculo as IVehicle).marca} ${(vehiculo as IVehicle).modelo}`;
    }
    const found = vehicles.find(v => v._id === vehiculo);
    return found ? `${found.marca} ${found.modelo}` : `Vehículo #${vehiculo}`;
  };

  // ────────── Helper: form vehículo compartido ──────────
  const VehicleFormFields = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {([
        ['placa', 'Placa'], ['marca', 'Marca'], ['modelo', 'Modelo'],
        ['color', 'Color'], ['imagenUrl', 'URL de Imagen'],
      ] as [keyof typeof vehicleForm, string][]).map(([field, label]) => (
        <div key={field}>
          <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>{label}:</label>
          <input
            className="reserv-input"
            style={{ width: '100%', boxSizing: 'border-box' }}
            value={String(vehicleForm[field])}
            onChange={e => setVehicleForm(f => ({ ...f, [field]: e.target.value }))}
            required={field !== 'imagenUrl'}
          />
        </div>
      ))}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Año:</label>
          <input className="reserv-input" style={{ width: '100%', boxSizing: 'border-box' }} type="number"
            value={vehicleForm.anio} onChange={e => setVehicleForm(f => ({ ...f, anio: Number(e.target.value) }))} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Kilometraje:</label>
          <input className="reserv-input" style={{ width: '100%', boxSizing: 'border-box' }} type="number"
            value={vehicleForm.kilometraje} onChange={e => setVehicleForm(f => ({ ...f, kilometraje: Number(e.target.value) }))} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Tipo:</label>
          <select className="reserv-select" value={vehicleForm.tipo} onChange={e => setVehicleForm(f => ({ ...f, tipo: e.target.value as IVehicle['tipo'] }))}>
            <option value="sedan">Sedán</option>
            <option value="suv">SUV</option>
            <option value="pickup">Pickup</option>
            <option value="van">Van</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Estado:</label>
          <select className="reserv-select" value={vehicleForm.estado} onChange={e => setVehicleForm(f => ({ ...f, estado: e.target.value as IVehicle['estado'] }))}>
            <option value="disponible">Disponible</option>
            <option value="reservado">Reservado</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="fuera_de_servicio">Fuera de Servicio</option>
          </select>
        </div>
      </div>
      <div>
        <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Último Mantenimiento:</label>
        <input className="reserv-input" style={{ width: '100%', boxSizing: 'border-box' }} type="datetime-local"
          value={vehicleForm.ultimoMantenimiento} onChange={e => setVehicleForm(f => ({ ...f, ultimoMantenimiento: e.target.value }))} />
      </div>
    </div>
  );

  // ──────────────────── RENDER ────────────────────
  return (
    <div className="user-panel" style={{ position: 'relative' }}>
      <UserProfileMenu />

      {/* ── Bienvenida ── */}
      <div className="welcome-header">
        <span className="welcome-text">
          ¡Bienvenido! {user?.nombre ?? ''} {user?.apellido ?? ''} 😊
        </span>
      </div>

      {/* ── Título ── */}
      <h2 style={{ textAlign: 'center', fontSize: '1.6rem', fontWeight: '700', color: '#000', marginBottom: '1rem' }}>
        Dashboard
      </h2>

      {/* ── Tabs ── */}
      <div className="panel-tabs">
        <button id="tab-usuarios"      className={`tab-btn${activeTab === 'usuarios'      ? ' active' : ''}`} onClick={() => setActiveTab('usuarios')}>👥 Ver a los Usuarios</button>
        <button id="tab-reservaciones" className={`tab-btn${activeTab === 'reservaciones' ? ' active' : ''}`} onClick={() => setActiveTab('reservaciones')}>📋 Ver Reservaciones</button>
        <button id="tab-vehiculos"     className={`tab-btn${activeTab === 'vehiculos'     ? ' active' : ''}`} onClick={() => setActiveTab('vehiculos')}>🚗 Ver Vehículos</button>
      </div>

      {/* ══════════ TAB: USUARIOS ══════════ */}
      {activeTab === 'usuarios' && (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn btn-create" onClick={() => setShowCreateUser(true)}>➕ Agregar Usuario</button>
          </div>
          {loadingUsers && <p className="res-status">Cargando usuarios…</p>}
          {errorUsers  && <p className="res-status res-error">{errorUsers}</p>}
          {!loadingUsers && !errorUsers && users.length === 0 && <p className="res-status">No hay usuarios registrados.</p>}
          {!loadingUsers && users.length > 0 && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th><th>Apellido</th><th>Email</th><th>Departamento</th><th>Rol</th><th>Activo</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.nombre}</td>
                    <td>{u.apellido}</td>
                    <td>{u.email}</td>
                    <td>{u.departamento}</td>
                    <td><span className="status-badge" style={{ backgroundColor: u.rol === 'admin' ? '#175fbd' : '#6b7280' }}>{u.rol}</span></td>
                    <td><span className="status-badge" style={{ backgroundColor: u.activo ? '#22c55e' : '#ef4444' }}>{u.activo ? 'Sí' : 'No'}</span></td>
                    <td style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-sm" onClick={() => openEdit(u)}>✏️ Editar</button>
                      <button className="btn btn-sm" style={{ backgroundColor: 'red', color: 'black', border: '2px solid red' }} onClick={() => setShowDeleteUserConfirm(u.id)}>🗑️ Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ══════════ TAB: RESERVACIONES ══════════ */}
      {activeTab === 'reservaciones' && (
        <div className="reservations-panel">
          {loadingRes && <p className="res-status">Cargando reservaciones…</p>}
          {errorRes   && <p className="res-status res-error">{errorRes}</p>}
          {!loadingRes && !errorRes && reservations.length === 0 && <p className="res-status">No hay reservaciones registradas.</p>}
          <div className="reservations-list">
            {reservations.map(r => (
              <div key={r._id} className="reservation-card">
                <div className="reservation-card-header">
                  <span className="res-vehicle-name">🚗 {getVehicleName(r.vehiculo)}</span>
                  <span className="status-badge" style={{ backgroundColor: ESTADO_RES_COLORS[r.estado] ?? '#6b7280' }}>
                    {r.estado.charAt(0).toUpperCase() + r.estado.slice(1).replace('_', ' ')}
                  </span>
                </div>
                <div className="reservation-card-info">
                  <span>📅 <strong>Inicio:</strong> {new Date(r.fechaInicio).toLocaleDateString('es-CL')}</span>
                  <span>📅 <strong>Fin:</strong>    {new Date(r.fechaFin).toLocaleDateString('es-CL')}</span>
                  {r.destino && <span>📍 <strong>Destino:</strong> {r.destino}</span>}
                </div>
                <button className="btn" style={{ marginTop: '1rem', width: '100%' }} onClick={() => setSelectedReservation(r)}>
                  Ver Reservación
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ TAB: VEHÍCULOS ══════════ */}
      {activeTab === 'vehiculos' && (
        <div>
          {/* Botón Agregar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn btn-create" onClick={() => { setVehicleForm(EMPTY_VEHICLE_FORM); setShowCreateVehicle(true); }}>
              ➕ Agregar Vehículo
            </button>
          </div>

          {loadingVehicles && <p className="res-status">Cargando vehículos…</p>}
          {!loadingVehicles && vehicles.length === 0 && <p className="res-status">No hay vehículos registrados.</p>}

          <div className="vehicles-grid">
            {vehicles.map(v => {
              const imgUrl = v.imagenUrl || camionetaBlancaImg;
              return (
                <div key={v._id} className="vehicle-card">
                  <img src={imgUrl} alt={`${v.marca} ${v.modelo}`} className="vehicle-card-img" />
                  <div className="vehicle-card-body">
                    <h2 className="vehicle-card-title">{v.marca} {v.modelo}</h2>
                    <div className="vehicle-card-info">
                      <span><strong>Patente:</strong> {v.placa}</span>
                      <span><strong>Año:</strong> {v.anio}</span>
                      <span><strong>Color:</strong> {v.color}</span>
                      <span><strong>Km:</strong> {v.kilometraje.toLocaleString('es-CL')}</span>
                      {v.ultimoMantenimiento && (
                        <span style={{ fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                          <strong>Último Mant.:</strong><br />
                          {new Date(v.ultimoMantenimiento).toLocaleString('es-CL')}
                        </span>
                      )}
                    </div>
                    <span className="status-badge" style={{ backgroundColor: ESTADO_VEHICLE_COLORS[v.estado] }}>
                      {ESTADO_VEHICLE_LABELS[v.estado]}
                    </span>
                    <button
                      id={`ver-vehiculo-admin-${v._id}`}
                      className="btn btn-sm"
                      style={{ marginTop: '10px', width: '100%' }}
                      onClick={() => setSelectedVehicle(v)}
                    >
                      🔍 Ver Vehículo
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════ MODAL: DETALLE VEHÍCULO (Admin) ══════════ */}
      {selectedVehicle && (
        <div className="modal-overlay" onClick={() => { setSelectedVehicle(null); setShowDeleteVehicleConfirm(null); }}>
          <div
            className="modal-content"
            style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '700px', width: '95%', color: '#000', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Botón cerrar */}
            <button
              onClick={() => { setSelectedVehicle(null); setShowDeleteVehicleConfirm(null); }}
              style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >X</button>

            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', textAlign: 'center' }}>
              🚗 {selectedVehicle.marca} {selectedVehicle.modelo}
            </h2>

            {/* Layout imagen + datos */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {/* Imagen */}
              <div style={{ flex: '0 0 auto' }}>
                <img
                  src={selectedVehicle.imagenUrl || camionetaBlancaImg}
                  alt={`${selectedVehicle.marca} ${selectedVehicle.modelo}`}
                  style={{ width: '260px', height: '180px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e5e7eb' }}
                />
              </div>

              {/* Datos */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '1.05rem', minWidth: '180px' }}>
                <p style={{ margin: 0 }}><strong>Patente:</strong> {selectedVehicle.placa}</p>
                <p style={{ margin: 0 }}><strong>Marca:</strong> {selectedVehicle.marca}</p>
                <p style={{ margin: 0 }}><strong>Modelo:</strong> {selectedVehicle.modelo}</p>
                <p style={{ margin: 0 }}><strong>Año:</strong> {selectedVehicle.anio}</p>
                <p style={{ margin: 0 }}><strong>Color:</strong> {selectedVehicle.color}</p>
                <p style={{ margin: 0 }}><strong>Tipo:</strong> {selectedVehicle.tipo}</p>
                <p style={{ margin: 0 }}><strong>Kilometraje:</strong> {selectedVehicle.kilometraje.toLocaleString('es-CL')} km</p>
                <p style={{ margin: 0 }}>
                  <strong>Estado:</strong>{' '}
                  <span className="status-badge" style={{ backgroundColor: ESTADO_VEHICLE_COLORS[selectedVehicle.estado] }}>
                    {ESTADO_VEHICLE_LABELS[selectedVehicle.estado]}
                  </span>
                </p>
                {selectedVehicle.ultimoMantenimiento && (
                  <p style={{ margin: 0 }}>
                    <strong>Último Mantenimiento:</strong><br />
                    {new Date(selectedVehicle.ultimoMantenimiento).toLocaleString('es-CL')}
                  </p>
                )}
              </div>
            </div>

            {/* Botones CRUD */}
            {showDeleteVehicleConfirm === selectedVehicle._id ? (
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem', textAlign: 'center' }}>
                <p style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '1rem', color: '#000' }}>
                  ¿Desea eliminar este Vehículo?
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    className="btn"
                    style={{ backgroundColor: 'red', color: 'black', padding: '0.5rem 2rem' }}
                    onClick={() => deleteVehicle(selectedVehicle._id)}
                  >
                    Sí
                  </button>
                  <button
                    className="btn"
                    style={{ backgroundColor: '#175fbd', color: 'black', padding: '0.5rem 2rem' }}
                    onClick={() => setShowDeleteVehicleConfirm(null)}
                  >
                    No
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem', flexWrap: 'wrap' }}>
                <button
                  className="btn"
                  style={{ backgroundColor: '#175fbd', color: 'black', padding: '0.6rem 1.8rem' }}
                  onClick={() => openEditVehicle(selectedVehicle)}
                >
                  ✏️ Editar Vehículo
                </button>
                <button
                  className="btn"
                  style={{ backgroundColor: 'red', color: 'black', padding: '0.6rem 1.8rem' }}
                  onClick={() => setShowDeleteVehicleConfirm(selectedVehicle._id)}
                >
                  🗑️ Eliminar Vehículo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ MODAL: CREAR VEHÍCULO ══════════ */}
      {showCreateVehicle && (
        <div className="modal-overlay" onClick={() => setShowCreateVehicle(false)}>
          <div
            className="modal-content"
            style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '520px', width: '95%', color: '#000', textAlign: 'left', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setShowCreateVehicle(false)} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>X</button>
            <h2 style={{ marginTop: 0, marginBottom: '1.25rem', textAlign: 'center' }}>➕ Agregar Vehículo</h2>
            <form onSubmit={createVehicle}>
              <VehicleFormFields />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'center' }}>
                <button type="submit" className="btn" style={{ backgroundColor: '#175fbd', color: 'black' }}>💾 Crear</button>
                <button type="button" className="btn" style={{ backgroundColor: '#e5e7eb', color: 'black' }} onClick={() => setShowCreateVehicle(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: EDITAR VEHÍCULO ══════════ */}
      {showEditVehicle && (
        <div className="modal-overlay" onClick={() => setShowEditVehicle(null)}>
          <div
            className="modal-content"
            style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '520px', width: '95%', color: '#000', textAlign: 'left', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setShowEditVehicle(null)} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>X</button>
            <h2 style={{ marginTop: 0, marginBottom: '1.25rem', textAlign: 'center' }}>✏️ Editar Vehículo</h2>
            <VehicleFormFields />
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'center' }}>
              <button className="btn" style={{ backgroundColor: '#175fbd', color: 'black' }} onClick={saveEditVehicle}>💾 Guardar</button>
              <button className="btn" style={{ backgroundColor: '#e5e7eb', color: 'black' }} onClick={() => setShowEditVehicle(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: DETALLE RESERVACIÓN ══════════ */}
      {selectedReservation && (
        <div className="modal-overlay" onClick={() => setSelectedReservation(null)}>
          <div
            className="modal-content"
            style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '520px', width: '90%', color: '#000', textAlign: 'center', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setSelectedReservation(null)} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>X</button>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Detalles de Reservación</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', textAlign: 'left', fontSize: '1.05rem' }}>
              <p style={{ margin: 0 }}><strong>Vehículo:</strong> {getVehicleName(selectedReservation.vehiculo)}</p>
              <p style={{ margin: 0 }}>
                <strong>Estado:</strong>{' '}
                <span className="status-badge" style={{ backgroundColor: ESTADO_RES_COLORS[selectedReservation.estado] ?? '#6b7280' }}>
                  {selectedReservation.estado.charAt(0).toUpperCase() + selectedReservation.estado.slice(1).replace('_', ' ')}
                </span>
              </p>
              <p style={{ margin: 0 }}><strong>Inicio:</strong> {new Date(selectedReservation.fechaInicio).toLocaleString('es-CL')}</p>
              <p style={{ margin: 0 }}><strong>Fin:</strong>    {new Date(selectedReservation.fechaFin).toLocaleString('es-CL')}</p>
              {selectedReservation.destino && <p style={{ margin: 0 }}><strong>Destino:</strong> {selectedReservation.destino}</p>}
              {selectedReservation.motivo  && <p style={{ margin: 0 }}><strong>Motivo:</strong>  {selectedReservation.motivo}</p>}
            </div>
            {selectedReservation.estado === 'pendiente' ? (
              <button
                className="btn"
                style={{ backgroundColor: '#22c55e', color: 'black', width: '100%', fontSize: '1rem', padding: '0.7rem' }}
                disabled={approvingId === selectedReservation._id}
                onClick={() => approveReservation(selectedReservation._id)}
              >
                {approvingId === selectedReservation._id ? 'Aprobando…' : '✅ Aprobar Reservación'}
              </button>
            ) : (
              <p style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '0.95rem' }}>
                Esta reservación ya no está pendiente de aprobación.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ══════════ MODAL: EDITAR USUARIO ══════════ */}
      {editUser && (
        <div className="modal-overlay" onClick={() => setEditUser(null)}>
          <div className="modal-content" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '480px', width: '90%', color: '#000', textAlign: 'left', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setEditUser(null)} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>X</button>
            <h2 style={{ marginTop: 0, marginBottom: '1.25rem', textAlign: 'center' }}>Editar Usuario</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(['nombre','apellido','email','departamento'] as const).map(field => (
                <div key={field}>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem', textTransform: 'capitalize' }}>{field}:</label>
                  <input className="reserv-input" style={{ width: '100%', boxSizing: 'border-box' }} value={editForm[field]} onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Rol:</label>
                <select className="reserv-select" value={editForm.rol} onChange={e => setEditForm(f => ({ ...f, rol: e.target.value as 'usuario' | 'admin' }))}>
                  <option value="usuario">Usuario</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label style={{ fontWeight: '600' }}>Activo:</label>
                <input type="checkbox" checked={editForm.activo} onChange={e => setEditForm(f => ({ ...f, activo: e.target.checked }))} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'center' }}>
              <button className="btn" style={{ backgroundColor: '#175fbd', color: 'black' }} onClick={saveEdit}>💾 Guardar</button>
              <button className="btn" style={{ backgroundColor: '#e5e7eb', color: 'black' }} onClick={() => setEditUser(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: CONFIRMAR ELIMINAR USUARIO ══════════ */}
      {showDeleteUserConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteUserConfirm(null)}>
          <div className="modal-content" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '90%', color: '#000', textAlign: 'center', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowDeleteUserConfirm(null)} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>X</button>
            <h2 style={{ marginTop: 0 }}>¿Eliminar usuario?</h2>
            <p style={{ color: '#555', marginBottom: '1.5rem' }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn" style={{ backgroundColor: 'red', color: 'black', padding: '0.5rem 2rem' }} onClick={() => deleteUser(showDeleteUserConfirm)}>Sí</button>
              <button className="btn" style={{ backgroundColor: '#175fbd', color: 'black', padding: '0.5rem 2rem' }} onClick={() => setShowDeleteUserConfirm(null)}>No</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: CREAR USUARIO ══════════ */}
      {showCreateUser && (
        <div className="modal-overlay" onClick={() => setShowCreateUser(false)}>
          <div className="modal-content" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '480px', width: '90%', color: '#000', textAlign: 'left', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowCreateUser(false)} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>X</button>
            <h2 style={{ marginTop: 0, marginBottom: '1.25rem', textAlign: 'center' }}>Agregar Usuario</h2>
            <form onSubmit={createUser} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {([['nombre','Nombre'],['apellido','Apellido'],['email','Email'],['password','Contraseña'],['departamento','Departamento']] as [keyof typeof createForm, string][]).map(([field, label]) => (
                <div key={field}>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>{label}:</label>
                  <input className="reserv-input" style={{ width: '100%', boxSizing: 'border-box' }} type={field === 'password' ? 'password' : 'text'} value={createForm[field]} onChange={e => setCreateForm(f => ({ ...f, [field]: e.target.value }))} required={field !== 'departamento'} />
                </div>
              ))}
              <div>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Rol:</label>
                <select className="reserv-select" value={createForm.rol} onChange={e => setCreateForm(f => ({ ...f, rol: e.target.value as 'usuario' | 'admin' }))}>
                  <option value="usuario">Usuario</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
                <button type="submit" className="btn" style={{ backgroundColor: '#175fbd', color: 'black' }}>➕ Crear</button>
                <button type="button" className="btn" style={{ backgroundColor: '#e5e7eb', color: 'black' }} onClick={() => setShowCreateUser(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
