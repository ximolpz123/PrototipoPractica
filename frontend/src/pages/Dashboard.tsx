import { useState, useEffect } from 'react';
import UserProfileMenu from '../components/UserProfileMenu';
import type { IUser, IReservation } from '../types';

import autoCafeImg from '../assets/auto-cafe.png';
import camionetaRojaImg from '../assets/camioneta-roja.png';
import camionetaAzulImg from '../assets/camioneta-azul.png';
import camionetaBlancaImg from '../assets/camioneta-blanca.png';

// ─── Datos fijos vehículos ────────────────────────────────────────────────────
const VEHICLES_DATA = [
  { id: '1', nombre: 'Auto Café',        imagen: autoCafeImg,        placa: 'ABC-1234', marca: 'Toyota',    modelo: 'Corolla',   anio: 2020, color: 'Café',   tipo: 'Sedán',   estado: 'disponible',       km: 32000 },
  { id: '2', nombre: 'Camioneta Roja',   imagen: camionetaRojaImg,   placa: 'DEF-5678', marca: 'Ford',      modelo: 'Ranger',    anio: 2021, color: 'Rojo',   tipo: 'Pickup',  estado: 'reservado',        km: 18500 },
  { id: '3', nombre: 'Camioneta Azul',   imagen: camionetaAzulImg,   placa: 'GHI-9012', marca: 'Chevrolet', modelo: 'Silverado', anio: 2019, color: 'Azul',   tipo: 'Pickup',  estado: 'mantenimiento',    km: 55200 },
  { id: '4', nombre: 'Camioneta Blanca', imagen: camionetaBlancaImg, placa: 'JKL-3456', marca: 'Nissan',    modelo: 'Frontier',  anio: 2022, color: 'Blanco', tipo: 'Pickup',  estado: 'fuera_de_servicio', km: 8900 },
];

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

// ─── Helpers ────────────────────────────────────────────────────────────────
const getVehicleName = (vehiculo: IReservation['vehiculo']) => {
  if (typeof vehiculo === 'object' && vehiculo !== null) {
    const found = VEHICLES_DATA.find(v => v.marca === (vehiculo as { marca: string }).marca && v.modelo === (vehiculo as { modelo: string }).modelo);
    return found ? found.nombre : `${(vehiculo as { marca: string; modelo: string }).marca} ${(vehiculo as { marca: string; modelo: string }).modelo}`;
  }
  const found = VEHICLES_DATA.find(v => v.id === vehiculo);
  return found ? found.nombre : `Vehículo #${vehiculo}`;
};

// ─── Componente principal ────────────────────────────────────────────────────
function Dashboard() {
  const storedUser = localStorage.getItem('user');
  const user: IUser | null = storedUser ? JSON.parse(storedUser) : null;

  const [activeTab, setActiveTab] = useState<DashTab>('usuarios');

  // ── Estado Usuarios ──
  const [users, setUsers] = useState<IUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState('');
  // CRUD modal
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

  const token = localStorage.getItem('token');

  // ── Cargar datos ──
  useEffect(() => {
    if (activeTab === 'usuarios') fetchUsers();
    if (activeTab === 'reservaciones') fetchReservations();
  }, [activeTab]);

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

  // ── CRUD Usuarios ──
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
      await fetch(`http://localhost:5000/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
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
      // Actualizar también el modal si está abierto
      setSelectedReservation(prev => prev && prev._id === id ? { ...prev, estado: 'aprobada' } : prev);
    } catch { alert('Error al aprobar reservación'); }
    finally { setApprovingId(null); }
  };

  return (
    <div className="user-panel" style={{ position: 'relative' }}>
      <UserProfileMenu />

      {/* ── Bienvenida ── */}
      <div className="welcome-header">
        <span className="welcome-text">
          ¡Bienvenido! {user?.nombre ?? ''} {user?.apellido ?? ''} 😊
        </span>
      </div>

      {/* ── Título Dashboard ── */}
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
        <div className="vehicles-grid">
          {VEHICLES_DATA.map(v => (
            <div key={v.id} className="vehicle-card">
              <img src={v.imagen} alt={v.nombre} className="vehicle-card-img" />
              <div className="vehicle-card-body">
                <h2 className="vehicle-card-title">{v.nombre}</h2>
                <div className="vehicle-card-info">
                  <span><strong>Patente:</strong> {v.placa}</span>
                  <span><strong>Marca:</strong>   {v.marca}</span>
                  <span><strong>Modelo:</strong>  {v.modelo}</span>
                  <span><strong>Año:</strong>     {v.anio}</span>
                  <span><strong>Color:</strong>   {v.color}</span>
                  <span><strong>Tipo:</strong>    {v.tipo}</span>
                  <span><strong>Km:</strong>      {v.km.toLocaleString('es-CL')}</span>
                </div>
                <span className="status-badge" style={{ backgroundColor: ESTADO_VEHICLE_COLORS[v.estado] }}>
                  {ESTADO_VEHICLE_LABELS[v.estado]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════ MODAL: DETALLE RESERVACIÓN (Admin) ══════════ */}
      {selectedReservation && (
        <div className="modal-overlay" onClick={() => setSelectedReservation(null)}>
          <div
            className="modal-content"
            style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '520px', width: '90%', color: '#000', textAlign: 'center', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Botón cerrar circular */}
            <button
              onClick={() => setSelectedReservation(null)}
              style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >X</button>

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
          <div
            className="modal-content"
            style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '480px', width: '90%', color: '#000', textAlign: 'left', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setEditUser(null)}
              style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >X</button>
            <h2 style={{ marginTop: 0, marginBottom: '1.25rem', textAlign: 'center' }}>Editar Usuario</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(['nombre','apellido','email','departamento'] as const).map(field => (
                <div key={field}>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem', textTransform: 'capitalize' }}>{field}:</label>
                  <input
                    className="reserv-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    value={editForm[field]}
                    onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                  />
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
          <div
            className="modal-content"
            style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '90%', color: '#000', textAlign: 'center', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowDeleteUserConfirm(null)}
              style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >X</button>
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
          <div
            className="modal-content"
            style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '480px', width: '90%', color: '#000', textAlign: 'left', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCreateUser(false)}
              style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >X</button>
            <h2 style={{ marginTop: 0, marginBottom: '1.25rem', textAlign: 'center' }}>Agregar Usuario</h2>
            <form onSubmit={createUser} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {([['nombre','Nombre'],['apellido','Apellido'],['email','Email'],['password','Contraseña'],['departamento','Departamento']] as [keyof typeof createForm, string][]).map(([field, label]) => (
                <div key={field}>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>{label}:</label>
                  <input
                    className="reserv-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    type={field === 'password' ? 'password' : 'text'}
                    value={createForm[field]}
                    onChange={e => setCreateForm(f => ({ ...f, [field]: e.target.value }))}
                    required={field !== 'departamento'}
                  />
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
