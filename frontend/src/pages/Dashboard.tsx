import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActiveVehiclesMap } from '../components/ActiveVehiclesMap';
import { RandomInspectionsPanel } from '../components/RandomInspectionsPanel';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import type { IUser, IReservation, IVehicle } from '../types';
import camionetaBlancaImg from '../assets/camioneta-blanca.png';
import autoCafeImg from '../assets/auto-cafe.png';
import camionetaAzulImg from '../assets/camioneta-azul.png';
import camionetaRojaImg from '../assets/camioneta-roja.png';
import nissanVersaNegroImg from '../assets/nissan versa negro.png';
import toyotaHiluxBlancoImg from '../assets/toyota hilux srv blanco.png';
import toyotaHiluxPlataImg from '../assets/toyota hilux srv plata.png';
import vwAmarokBlancoImg from '../assets/volkswagen amarok blanco.png';
import vwAmarokGrisImg from '../assets/volkswagen amarok gris.png';
const defaultProfileImg = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
import logo from '../assets/bit-mejorado.png';

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

type DashTab = 'dashboard' | 'usuarios' | 'reservaciones' | 'vehiculos-activos' | 'vehiculos' | 'reportes' | 'inspecciones' | 'perfil' | 'soporte';

const MOCK_REPORTES_DATA = [
  { name: 'Ventas', res: 12, costo: 120000, km: 800, horas: 45 },
  { name: 'Soporte', res: 8, costo: 85000, km: 560, horas: 30 },
  { name: 'Logística', res: 6, costo: 75000, km: 500, horas: 25 },
  { name: 'Gerencia', res: 3, costo: 40000, km: 260, horas: 15 },
  { name: 'RRHH', res: 2, costo: 25000, km: 160, horas: 10 },
];
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

  // Fallbacks genéricos según tipo y color
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

// ─── Helper: normalizar usuario (API puede devolver _id o id) ─────────────────
function normalizeUser(u: Record<string, unknown>): IUser {
  return {
    ...u,
    id: (u.id ?? u._id) as string,
  } as IUser;
}

// ─── Componente principal ────────────────────────────────────────────────────
function Dashboard() {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem('user');
  const user: IUser | null = storedUser ? JSON.parse(storedUser) : null;
  const token = localStorage.getItem('token');

  const profileImgKey = user ? `profile_img_${user.id}` : 'profile_img_default';
  const [profileImg, setProfileImg] = useState<string>(
    localStorage.getItem(profileImgKey) || defaultProfileImg
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<DashTab>('dashboard');

  // ── Estado Usuarios ──
  const [users, setUsers] = useState<IUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState('');
  const [editUser, setEditUser] = useState<IUser | null>(null);
  const [viewUser, setViewUser] = useState<IUser | null>(null);
  const [editForm, setEditForm] = useState({ nombre: '', apellido: '', email: '', departamento: '', telefono: '', rol: 'usuario' as 'usuario' | 'admin', activo: true });
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createForm, setCreateForm] = useState({ nombre: '', apellido: '', email: '', password: '', departamento: '', telefono: '', rol: 'usuario' as 'usuario' | 'admin' });
  const [createUserLicenciaFile, setCreateUserLicenciaFile] = useState<File | null>(null);

  // ── Estado Reservaciones ──
  const [reservations, setReservations] = useState<IReservation[]>([]);
  const [loadingRes, setLoadingRes] = useState(false);
  const [errorRes, setErrorRes] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<IReservation | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [showCreateRes, setShowCreateRes] = useState(false);
  const [createResForm, setCreateResForm] = useState({ usuarioId: 'me', vehiculoId: '', fechaInicio: '', fechaFin: '', destino: '', motivo: '' });
  const [createResError, setCreateResError] = useState('');
  const [isCreatingRes, setIsCreatingRes] = useState(false);

  // ── Filtros de Reservaciones ──
  const [resFilterVehicle, setResFilterVehicle] = useState('todos');
  const [resFilterDate, setResFilterDate] = useState('');
  const [resFilterPhotos, setResFilterPhotos] = useState('todas');
  const [resFilterStatus, setResFilterStatus] = useState('todos');

  // ── Estado Vehículos ──
  const [vehicles, setVehicles] = useState<IVehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<IVehicle | null>(null);
  const [showDeleteVehicleConfirm, setShowDeleteVehicleConfirm] = useState<string | null>(null);
  const [showCreateVehicle, setShowCreateVehicle] = useState(false);
  const [showEditVehicle, setShowEditVehicle] = useState<IVehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE_FORM);
  const [vehicleImageFile, setVehicleImageFile] = useState<File | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // ── Cargar datos al cambiar tab ──
  useEffect(() => {
    if (activeTab === 'usuarios') fetchUsers();
    if (activeTab === 'reservaciones') {
      fetchReservations();
      fetchVehicles();
    }
    if (activeTab === 'vehiculos') fetchVehicles();
  }, [activeTab]);

  // ────────── FETCH FUNCTIONS ──────────
  const fetchUsers = async () => {
    setLoadingUsers(true); setErrorUsers('');
    try {
      const res = await fetch('http://localhost:5000/api/users', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      // Normaliza _id → id por si la API devuelve _id
      const normalized = Array.isArray(data) ? data.map(u => {
        const n = normalizeUser(u);
        n.banderaActual = n.rol === 'admin' ? 'verde' : 'amarilla';
        return n;
      }) : [];
      setUsers(normalized);
    } catch { setErrorUsers('Error al cargar usuarios. Verifica que el servidor esté activo.'); }
    finally { setLoadingUsers(false); }
  };

  const fetchReservations = async () => {
    setLoadingRes(true); setErrorRes('');
    fetch('http://localhost:5000/api/reservations', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setReservations(Array.isArray(data) ? data : []))
      .catch(err => setErrorRes(err.message))
      .finally(() => setLoadingRes(false));
  };

  const handleCreateReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateResError('');
    setIsCreatingRes(true);
    try {
      const payload: any = {
        vehiculo: createResForm.vehiculoId,
        fechaInicio: createResForm.fechaInicio,
        fechaFin: createResForm.fechaFin,
        destino: createResForm.destino,
        motivo: createResForm.motivo,
      };
      if (createResForm.usuarioId && createResForm.usuarioId !== 'me') {
        payload.usuarioId = createResForm.usuarioId;
      }
      const res = await fetch('http://localhost:5000/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al crear la reservación');
      setShowCreateRes(false);
      setCreateResForm({ usuarioId: 'me', vehiculoId: '', fechaInicio: '', fechaFin: '', destino: '', motivo: '' });
      fetchReservations(); // Recargar reservaciones
    } catch (err: any) {
      setCreateResError(err.message);
    } finally {
      setIsCreatingRes(false);
    }
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

  // ── Foto de perfil ──
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

  // ── Logout ──
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // ────────── CRUD USUARIOS ──────────
  const openEdit = (u: IUser) => {
    setEditUser(u);
    setEditForm({ nombre: u.nombre, apellido: u.apellido, email: u.email, departamento: u.departamento || '', telefono: u.telefono || '', rol: u.rol, activo: u.activo });
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
      const formData = new FormData();
      Object.entries(createForm).forEach(([key, value]) => formData.append(key, value));
      if (!createUserLicenciaFile) {
        alert('La foto de la licencia es obligatoria');
        return;
      }
      formData.append('licenciaFoto', createUserLicenciaFile);

      await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      setShowCreateUser(false);
      setCreateForm({ nombre: '', apellido: '', email: '', password: '', departamento: '', telefono: '', rol: 'usuario' });
      setCreateUserLicenciaFile(null);
      fetchUsers();
    } catch { alert('Error al crear usuario'); }
  };

  // ────────── CRUD VEHÍCULOS ──────────
  const createVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalImageUrl = vehicleForm.imagenUrl;
      if (vehicleImageFile) {
        const formData = new FormData();
        formData.append('imagen', vehicleImageFile);
        const uploadRes = await fetch('http://localhost:5000/api/vehicles/upload-image', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalImageUrl = uploadData.url;
        } else {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(`Upload Falló: ${errData.message || uploadRes.statusText}`);
        }
      }

      const body = { ...vehicleForm, imagenUrl: finalImageUrl, ultimoMantenimiento: vehicleForm.ultimoMantenimiento || undefined };
      const createRes = await fetch('http://localhost:5000/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(`BD Falló: ${errData.message || createRes.statusText}`);
      }

      setShowCreateVehicle(false);
      setVehicleForm(EMPTY_VEHICLE_FORM);
      setVehicleImageFile(null);
      fetchVehicles();
    } catch (error: any) { alert(`Error al crear vehículo:\n${error.message || error}`); }
  };

  const openEditVehicle = (v: IVehicle) => {
    setShowEditVehicle(v);
    setSelectedVehicle(null);
    setVehicleImageFile(null);
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
      let finalImageUrl = vehicleForm.imagenUrl;
      if (vehicleImageFile) {
        const formData = new FormData();
        formData.append('imagen', vehicleImageFile);
        const uploadRes = await fetch('http://localhost:5000/api/vehicles/upload-image', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalImageUrl = uploadData.url;
        } else {
          throw new Error('Error al subir imagen');
        }
      }

      const body = { ...vehicleForm, imagenUrl: finalImageUrl, ultimoMantenimiento: vehicleForm.ultimoMantenimiento || undefined };
      await fetch(`http://localhost:5000/api/vehicles/${showEditVehicle._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      setShowEditVehicle(null);
      setVehicleForm(EMPTY_VEHICLE_FORM);
      setVehicleImageFile(null);
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
      const response = await fetch(`http://localhost:5000/api/reservations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado: 'aprobada' }),
      });
      if (!response.ok) throw new Error('Falló la aprobación');
      await fetchReservations();
      setSelectedReservation(prev => prev && prev._id === id ? { ...prev, estado: 'aprobada' } : prev);
    } catch { alert('Error al aprobar reservación'); }
    finally { setApprovingId(null); }
  };

  // ── Rechazar Reservación ──
  const rejectReservation = async (id: string) => {
    if (!rejectReason.trim()) {
      alert('Por favor, escriba el motivo del rechazo.');
      return;
    }
    setIsRejecting(true);
    try {
      const response = await fetch(`http://localhost:5000/api/reservations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado: 'rechazada', motivoRechazo: rejectReason }),
      });
      if (!response.ok) throw new Error('Falló el rechazo');
      await fetchReservations();
      setSelectedReservation(prev => prev && prev._id === id ? { ...prev, estado: 'rechazada', motivoRechazo: rejectReason } : prev);
      setShowRejectForm(false);
      setRejectReason('');
    } catch { alert('Error al rechazar reservación'); }
    finally { setIsRejecting(false); }
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
  const renderVehicleFormFields = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '220px' }}>
          <label style={{ fontWeight: '600', width: '70px', margin: 0, textAlign: 'right' }}>Placa:</label>
          <input
            className="reserv-input"
            style={{ flex: 1, boxSizing: 'border-box', margin: 0 }}
            value={String(vehicleForm.placa)}
            onChange={e => {
              let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
              setVehicleForm(f => ({ ...f, placa: val }));
            }}
            required
            maxLength={8}
            title="Formato requerido (ej: AAA-123 o BBB-1234)"
            placeholder="AAA-123"
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '220px' }}>
          <label style={{ fontWeight: '600', width: '70px', margin: 0, textAlign: 'right' }}>Marca:</label>
          <input
            className="reserv-input"
            style={{ flex: 1, boxSizing: 'border-box', margin: 0 }}
            value={String(vehicleForm.marca)}
            onChange={e => setVehicleForm(f => ({ ...f, marca: e.target.value }))}
            required
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '220px' }}>
          <label style={{ fontWeight: '600', width: '70px', margin: 0, textAlign: 'right' }}>Modelo:</label>
          <input
            className="reserv-input"
            style={{ flex: 1, boxSizing: 'border-box', margin: 0 }}
            value={String(vehicleForm.modelo)}
            onChange={e => setVehicleForm(f => ({ ...f, modelo: e.target.value }))}
            required
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '220px' }}>
          <label style={{ fontWeight: '600', width: '70px', margin: 0, textAlign: 'right' }}>Color:</label>
          <input
            className="reserv-input"
            style={{ flex: 1, boxSizing: 'border-box', margin: 0 }}
            value={String(vehicleForm.color)}
            onChange={e => setVehicleForm(f => ({ ...f, color: e.target.value }))}
            required
          />
        </div>
      </div>
      {/* 
      <div>
        <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>URL de Imagen:</label>
        <input
          className="reserv-input"
          style={{ width: '100%', boxSizing: 'border-box' }}
          value={String(vehicleForm.imagenUrl)}
          onChange={e => setVehicleForm(f => ({ ...f, imagenUrl: e.target.value }))}
          placeholder="Ej: https://... (o sube una imagen abajo)"
        />
      </div>
      */}
      <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '220px' }}>
          <label style={{ fontWeight: '600', width: '70px', margin: 0, textAlign: 'right' }}>Año:</label>
          <input className="reserv-input" style={{ flex: 1, boxSizing: 'border-box', margin: 0 }} type="number"
            value={vehicleForm.anio} onChange={e => setVehicleForm(f => ({ ...f, anio: Number(e.target.value) }))} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '220px' }}>
          <label style={{ fontWeight: '600', width: '70px', margin: 0, textAlign: 'right' }}>Km:</label>
          <input className="reserv-input" style={{ flex: 1, boxSizing: 'border-box', margin: 0 }} type="number"
            value={vehicleForm.kilometraje} onChange={e => setVehicleForm(f => ({ ...f, kilometraje: Number(e.target.value) }))} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '220px' }}>
          <label style={{ fontWeight: '600', width: '70px', margin: 0, textAlign: 'right' }}>Tipo:</label>
          <select className="reserv-select" style={{ flex: 1, margin: 0 }} value={vehicleForm.tipo} onChange={e => setVehicleForm(f => ({ ...f, tipo: e.target.value as IVehicle['tipo'] }))}>
            <option value="sedan">Sedán</option>
            <option value="suv">SUV</option>
            <option value="pickup">Pickup</option>
            <option value="van">Van</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '220px' }}>
          <label style={{ fontWeight: '600', width: '70px', margin: 0, textAlign: 'right' }}>Estado:</label>
          <select className="reserv-select" style={{ flex: 1, margin: 0 }} value={vehicleForm.estado} onChange={e => setVehicleForm(f => ({ ...f, estado: e.target.value as IVehicle['estado'] }))}>
            <option value="disponible">Disponible</option>
            {!showCreateVehicle && <option value="reservado">Reservado</option>}
            <option value="mantenimiento">Mantenimiento</option>
            <option value="fuera_de_servicio">Fuera de Servicio</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
        <label style={{ fontWeight: '600', whiteSpace: 'nowrap', margin: 0 }}>Último Mantenimiento:</label>
        <input className="reserv-input" style={{ width: '200px', boxSizing: 'border-box', margin: 0 }} type="datetime-local"
          value={vehicleForm.ultimoMantenimiento} onChange={e => setVehicleForm(f => ({ ...f, ultimoMantenimiento: e.target.value }))} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          <label style={{ fontWeight: '600', whiteSpace: 'nowrap', margin: 0 }}>Subir Imagen (.png):</label>
          <input
            key={vehicleImageFile ? vehicleImageFile.name : 'empty'}
            type="file"
            accept=".png"
            className="reserv-input"
            style={{ width: '240px', boxSizing: 'border-box', padding: '0.4rem', margin: 0 }}
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
                  alert('Solo se permiten imágenes en formato .png');
                  e.target.value = '';
                  return;
                }
                setVehicleImageFile(file);
              } else {
                setVehicleImageFile(null);
              }
            }}
          />
        </div>
        {vehicleImageFile && (
          <div style={{ position: 'relative', marginTop: '0.5rem' }}>
            <img
              src={URL.createObjectURL(vehicleImageFile)}
              alt="Preview"
              style={{ width: '200px', height: '120px', objectFit: 'cover', borderRadius: '4px', border: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}
            />
            <button
              type="button"
              onClick={() => setVehicleImageFile(null)}
              style={{
                position: 'absolute', top: '-10px', right: '-10px',
                width: '24px', height: '24px', borderRadius: '50%',
                backgroundColor: '#ef4444', color: 'white', border: 'none',
                cursor: 'pointer', fontWeight: 'bold', display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: 0,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
              title="Quitar imagen"
            >
              X
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ────────── Helper: filter reservations ──────────
  const ESTADO_PRIORITY: Record<string, number> = {
    en_curso: 1,
    aprobada: 2,
    pendiente: 3,
    completada: 4,
    cancelada: 5,
  };

  const filteredReservations = reservations.filter(r => {
    if (resFilterStatus !== 'todos' && r.estado !== resFilterStatus) return false;
    if (resFilterVehicle !== 'todos') {
      const vId = typeof r.vehiculo === 'object' && r.vehiculo !== null ? (r.vehiculo as any)._id : r.vehiculo;
      if (vId !== resFilterVehicle) return false;
    }
    if (resFilterDate) {
      const rDate = new Date(r.createdAt || r.fechaInicio).toISOString().split('T')[0];
      if (rDate !== resFilterDate) return false;
    }
    if (resFilterPhotos === 'inicio') {
      if (!r.fotosSalida || r.fotosSalida.length === 0) return false;
    } else if (resFilterPhotos === 'fin') {
      if (!r.fotosRetorno || r.fotosRetorno.length === 0) return false;
    }
    return true;
  }).sort((a, b) => {
    const pA = ESTADO_PRIORITY[a.estado] || 99;
    const pB = ESTADO_PRIORITY[b.estado] || 99;
    return pA - pB;
  });

  const exportToCSV = () => {
    const headers = ['Departamento', 'Reservas', 'Km Totales', 'Horas Uso', 'Costo Total ($)'];
    const rows = MOCK_REPORTES_DATA.map(d => `${d.name};${d.res};${d.km};${d.horas};${d.costo}`);
    const csvContent = "\uFEFF" + headers.join(';') + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "reporte_gastos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ──────────────────── RENDER ────────────────────
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

        {/* Perfil */}
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
          </div>
        </div>

        {/* Navegación en orden */}
        <nav className="sidebar-nav">
          <button
            id="sidebar-btn-dashboard"
            className={`sidebar-btn${activeTab === 'dashboard' ? ' active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="btn-icon"></span> Dashboard
          </button>
          <button
            id="sidebar-btn-usuarios"
            className={`sidebar-btn${activeTab === 'usuarios' ? ' active' : ''}`}
            onClick={() => setActiveTab('usuarios')}
          >
            <span className="btn-icon"></span> Usuarios
          </button>
          <button
            id="sidebar-btn-reservaciones"
            className={`sidebar-btn${activeTab === 'reservaciones' ? ' active' : ''}`}
            onClick={() => setActiveTab('reservaciones')}
          >
            <span className="btn-icon"></span> Reservaciones
          </button>
          <button
            id="sidebar-btn-vehiculos-activos"
            className={`sidebar-btn${activeTab === 'vehiculos-activos' ? ' active' : ''}`}
            onClick={() => setActiveTab('vehiculos-activos')}
          >
            <span className="btn-icon"></span> Vehículos Activos
          </button>
          <button
            id="sidebar-btn-vehiculos"
            className={`sidebar-btn${activeTab === 'vehiculos' ? ' active' : ''}`}
            onClick={() => setActiveTab('vehiculos')}
          >
            <span className="btn-icon"></span> Configuración Flota
          </button>
          <button
            id="sidebar-btn-inspecciones"
            className={`sidebar-btn${activeTab === 'inspecciones' ? ' active' : ''}`}
            onClick={() => setActiveTab('inspecciones')}
          >
            <span className="btn-icon"></span> Insp. Aleatorias
          </button>
          {user?.rol === 'admin' && (
            <button
              id="sidebar-btn-reportes"
              className={`sidebar-btn${activeTab === 'reportes' ? ' active' : ''}`}
              onClick={() => setActiveTab('reportes')}
            >
              <span className="btn-icon"></span> Reportes de Gastos
            </button>
          )}
        </nav>

        {/* Acciones inferiores */}
        <div className="sidebar-logout" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 12px', width: '100%', boxSizing: 'border-box', marginBottom: '16px' }}>
          <button
            onClick={() => setActiveTab('perfil')}
            style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'normal', fontSize: '14px', cursor: 'pointer', textDecoration: activeTab === 'perfil' ? 'underline' : 'none', padding: '4px' }}
          >
            Configuración de Perfil
          </button>
          <button
            onClick={() => setActiveTab('soporte')}
            style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'normal', fontSize: '14px', cursor: 'pointer', textDecoration: activeTab === 'soporte' ? 'underline' : 'none', padding: '4px' }}
          >
            Soporte Técnico
          </button>
          <button className="sidebar-logout-btn" onClick={() => setShowLogoutModal(true)}>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ══════════ CONTENIDO PRINCIPAL ══════════ */}
      <main className="dashboard-content">

        {/* ── Bienvenida ── */}
        <div className="welcome-header" style={{ maxWidth: '100%' }}>
          <span className="welcome-text">
            ¡Bienvenido! {user?.nombre ?? ''} {user?.apellido ?? ''}
          </span>
        </div>

        {/* ══════════ TAB: DASHBOARD ══════════ */}
        {activeTab === 'dashboard' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'flex-start' }}>
            <h2 style={{ textAlign: 'left', fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-h)', margin: 0 }}>
              Resumen General
            </h2>
            <div style={{ display: 'flex', width: '100%', gap: '24px', flexWrap: 'wrap', alignItems: 'stretch' }}>

              {/* PANEL IZQUIERDO: Estado de Reservas */}
              <div style={{ flex: 2, minWidth: '500px', display: 'flex', flexDirection: 'column' }}>
                <div className="dash-stat-card dash-stat-full" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '1.4rem', position: 'relative', overflow: 'hidden', height: '100%' }}>
                  <div style={{ position: 'absolute', right: '-10px', bottom: '-40px', fontSize: '18rem', opacity: 0.04, pointerEvents: 'none', zIndex: 0 }}>
                    🚗
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '1.5rem', zIndex: 1, position: 'relative' }}>
                    <span className="dash-stat-label" style={{ margin: 0, fontSize: '1.2rem', color: '#000000ff' }}>Estado de Reservas</span>
                    <button className="btn-sm" onClick={() => setActiveTab('reservaciones')}>Ir a Reservaciones ➔</button>
                  </div>

                  {(() => {
                    const resCounts = {
                      pendiente: reservations.filter(r => r.estado === 'pendiente').length,
                      aprobada: reservations.filter(r => r.estado === 'aprobada').length,
                      en_curso: reservations.filter(r => r.estado === 'en_curso').length,
                      completada: reservations.filter(r => r.estado === 'completada').length,
                      otras: reservations.filter(r => ['cancelada', 'rechazada'].includes(r.estado)).length,
                    };
                    const colors: Record<string, string> = { pendiente: '#f59e0b', aprobada: '#22c55e', en_curso: '#3b82f6', completada: '#8b5cf6', otras: '#ef4444' };

                    const data = [
                      { name: 'Pendientes', value: resCounts.pendiente, color: colors.pendiente },
                      { name: 'Aprobadas', value: resCounts.aprobada, color: colors.aprobada },
                      { name: 'En Curso', value: resCounts.en_curso, color: colors.en_curso },
                      { name: 'Completadas', value: resCounts.completada, color: colors.completada },
                      { name: 'Canceladas/Rech.', value: resCounts.otras, color: colors.otras },
                    ].filter(item => item.value > 0);

                    const today = new Date().toISOString().split('T')[0];
                    const salidasHoy = reservations.filter(r => r.fechaInicio && r.fechaInicio.startsWith(today)).length;
                    const retornosHoy = reservations.filter(r => r.fechaFin && r.fechaFin.startsWith(today)).length;

                    const recentReservations = [...reservations]
                      .sort((a, b) => new Date(b.createdAt || b.fechaInicio).getTime() - new Date(a.createdAt || a.fechaInicio).getTime())
                      .slice(0, 3);

                    return (
                      <div style={{ display: 'flex', width: '100%', alignItems: 'stretch', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem', zIndex: 1, position: 'relative' }}>

                        <div style={{ display: 'flex', flex: 2, alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '2rem', minWidth: '300px' }}>
                          {/* Gráfico Donut de Recharts */}
                          <div style={{ width: '220px', height: '220px' }}>
                            {reservations.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                  >
                                    {data.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                        return (
                                          <div style={{ backgroundColor: '#1f2937', padding: '8px 12px', borderRadius: '8px', color: '#fff', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{payload[0].name}</div>
                                            <div>{payload[0].value}</div>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span className="stat-color-gray">Sin reservas registradas</span>
                              </div>
                            )}
                          </div>

                          {/* Leyenda Mejorada y Stats Rápidos */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, minWidth: '250px' }}>

                            {/* Indicadores Clave */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                              <div style={{ background: '#fef3c7', padding: '10px 16px', borderRadius: '12px', borderLeft: `4px solid ${colors.pendiente}`, width: '200px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: 'bold' }}>Pendientes</div>
                                <div style={{ fontSize: '1.6rem', color: '#b45309', fontWeight: '800', lineHeight: 1.2, marginTop: '4px' }}>{resCounts.pendiente}</div>
                              </div>
                              <div style={{ background: '#e0f2fe', padding: '10px 16px', borderRadius: '12px', borderLeft: `4px solid ${colors.en_curso}`, width: '200px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.85rem', color: '#075985', fontWeight: 'bold' }}>Salidas Hoy</div>
                                <div style={{ fontSize: '1.6rem', color: '#0ea5e9', fontWeight: '800', lineHeight: 1.2, marginTop: '4px' }}>{salidasHoy}</div>
                              </div>
                              <div style={{ background: '#dcfce7', padding: '10px 16px', borderRadius: '12px', borderLeft: `4px solid ${colors.aprobada}`, width: '200px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 'bold' }}>Retornos Hoy</div>
                                <div style={{ fontSize: '1.6rem', color: '#16a34a', fontWeight: '800', lineHeight: 1.2, marginTop: '4px' }}>{retornosHoy}</div>
                              </div>
                            </div>
                          </div>

                          {/* Leyenda tipo "Pills" (Todos los estados, abajo) */}
                          <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginTop: '1rem' }}>
                            {[
                              { name: 'Pendientes', value: resCounts.pendiente, color: colors.pendiente },
                              { name: 'Aprobadas', value: resCounts.aprobada, color: colors.aprobada },
                              { name: 'En Curso', value: resCounts.en_curso, color: colors.en_curso },
                              { name: 'Completadas', value: resCounts.completada, color: colors.completada },
                              { name: 'Canceladas/Rech.', value: resCounts.otras, color: colors.otras },
                            ].map((item, i) => (
                              <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: 'white', padding: '6px 14px', borderRadius: '20px',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6',
                                fontSize: '0.85rem', fontWeight: '600', color: '#111827'
                              }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }}></div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {item.name}: <div style={{ color: item.color, marginLeft: '2px' }}>{item.value}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Actividad Reciente */}
                        <div style={{ flex: 1, minWidth: '250px', display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '1px solid rgba(0,0,0,0.1)', paddingLeft: '1.5rem' }}>
                          <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-h)', fontWeight: '700' }}>Última Actividad</h4>
                          {recentReservations.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {recentReservations.map((r, idx) => {
                                const stColor = ['cancelada', 'rechazada'].includes(r.estado) ? colors.otras : (colors[r.estado] || '#6b7280');
                                return (
                                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', padding: '12px', background: 'white', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', color: '#111827' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#111827' }}>{getVehicleName(r.vehiculo)}</div>
                                      <div style={{ fontSize: '0.75rem', color: 'white', background: stColor, padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                                        {r.estado}
                                      </div>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: '6px', fontWeight: '500' }}>
                                      {typeof r.usuario === 'object' && r.usuario !== null ? `${(r.usuario as IUser).nombre} ${(r.usuario as IUser).apellido}` : `Usuario ID: ${r.usuario}`}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>
                                      Fecha inicio: {new Date(r.fechaInicio).toLocaleDateString()}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="stat-color-gray" style={{ fontSize: '0.9rem' }}>No hay actividad reciente.</span>
                          )}
                        </div>

                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* PANEL DERECHO: 3 Paneles de Resumen */}
              <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* 1. Usuarios */}
                <div className="dash-stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                  <span className="dash-stat-label" style={{ marginBottom: '1rem', color: '#000000ff' }}>Usuarios Activos</span>
                  <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div className="stat-color-blue" style={{ fontSize: '2.5rem', fontWeight: 'bold', lineHeight: 1 }}>{users.filter(u => u.activo).length}</div>
                      <div className="stat-color-blue" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Activos</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div className="stat-color-gray" style={{ fontSize: '2.5rem', fontWeight: 'bold', lineHeight: 1 }}>{users.filter(u => !u.activo).length}</div>
                      <div className="stat-color-gray" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>No Activos</div>
                    </div>
                  </div>
                </div>

                {/* 2. Vehículos Disponibles / En Curso */}
                <div className="dash-stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                  <span className="dash-stat-label" style={{ marginBottom: '1rem', color: '#000000ff' }}>Estado de Vehículos</span>
                  <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div className="stat-color-green" style={{ fontSize: '2.5rem', fontWeight: 'bold', lineHeight: 1 }}>{vehicles.filter(v => v.estado === 'disponible').length}</div>
                      <div className="stat-color-green" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Disponibles</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div className="stat-color-orange" style={{ fontSize: '2.5rem', fontWeight: 'bold', lineHeight: 1 }}>{vehicles.filter(v => v.estado === 'reservado').length}</div>
                      <div className="stat-color-orange" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>En Curso</div>
                    </div>
                  </div>
                </div>

                {/* 3. Mantenimiento */}
                <div className="dash-stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                  <span className="dash-stat-label" style={{ color: '#000000ff' }}>En Mantenimiento</span>
                  <div className="stat-color-red" style={{ fontSize: '3rem', margin: '0.5rem 0', fontWeight: 'bold' }}>{vehicles.filter(v => v.estado === 'mantenimiento').length}</div>
                  <span className="dash-stat-sub" style={{ fontWeight: 'bold' }}>Vehículos no disponibles</span>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ══════════ TAB: USUARIOS ══════════ */}
        {activeTab === 'usuarios' && (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700', color: '#000' }}> Usuarios</h2>
              <button className="btn btn-create" onClick={() => setShowCreateUser(true)}>➕ Agregar Usuario</button>
            </div>
            {loadingUsers && <p className="res-status">Cargando usuarios…</p>}
            {errorUsers && <p className="res-status res-error">{errorUsers}</p>}
            {!loadingUsers && !errorUsers && users.length === 0 && <p className="res-status">No hay usuarios registrados.</p>}
            {!loadingUsers && users.length > 0 && (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th><th>Apellido</th><th>Email</th><th>Departamento</th><th>Teléfono</th><th>Licencia Estado</th><th>Rol</th><th>Activo</th><th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>{u.nombre}</td>
                      <td>{u.apellido}</td>
                      <td>{u.email}</td>
                      <td>{u.departamento}</td>
                      <td>{u.telefono || 'N/A'}</td>
                      <td><span className="status-badge" style={{ backgroundColor: u.licenciaAlDia ? '#22c55e' : '#ef4444' }}>{u.licenciaAlDia ? 'Al Día' : 'No Al Día'}</span></td>
                      <td><span className="status-badge" style={{ backgroundColor: u.rol === 'admin' ? '#175fbd' : '#6b7280' }}>{u.rol}</span></td>
                      <td><span className="status-badge" style={{ backgroundColor: u.activo ? '#22c55e' : '#ef4444' }}>{u.activo ? 'Sí' : 'No'}</span></td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
                          <button className="btn btn-sm" onClick={() => setViewUser(u)}>Ver</button>
                        </div>
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
          <div className="reservations-panel" style={{ maxWidth: '100%' }}>
            {!showCreateRes ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', width: '100%' }}>
                  <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-h)' }}> Reservaciones</h2>
                  {user?.rol === 'admin' && (
                    <button className="btn" style={{ margin: 0 }} onClick={() => setShowCreateRes(true)}>
                      Crear Reservación
                    </button>
                  )}
                </div>

                {user?.rol === 'admin' && (
                  <div className="filter-panel" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px', width: '100%', boxSizing: 'border-box', alignItems: 'flex-end' }}>
                    <div style={{ flex: '1' }}>
                      <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>Filtro de Estado de las Reservas</label>
                      <select className="reserv-input" style={{ width: '100%', boxSizing: 'border-box', height: '44px' }} value={resFilterStatus} onChange={e => setResFilterStatus(e.target.value)}>
                        <option value="todos">Todos los Estados</option>
                        <option value="en_curso">En Curso</option>
                        <option value="aprobada">Aprobada</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="completada">Completada</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>
                    <div style={{ flex: '1' }}>
                      <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>Vehículo</label>
                      <select className="reserv-input" style={{ width: '100%', boxSizing: 'border-box', height: '44px' }} value={resFilterVehicle} onChange={e => setResFilterVehicle(e.target.value)}>
                        <option value="todos">Todos los Vehículos</option>
                        {vehicles.map(v => (
                          <option key={v._id} value={v._id}>{v.marca} {v.modelo} - {v.placa}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: '1' }}>
                      <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>Fecha de Creación</label>
                      <input type="date" className="reserv-input" style={{ width: '100%', boxSizing: 'border-box', height: '44px' }} value={resFilterDate} onChange={e => setResFilterDate(e.target.value)} />
                    </div>
                    <div style={{ flex: '1' }}>
                      <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>Evidencia</label>
                      <div style={{ display: 'flex', gap: '0.5rem', height: '44px' }}>
                        <select className="reserv-input" style={{ flex: '1', boxSizing: 'border-box', height: '100%' }} value={resFilterPhotos} onChange={e => setResFilterPhotos(e.target.value)}>
                          <option value="todas">Toda la evidencia</option>
                          <option value="inicio">Solo de inicio</option>
                          <option value="fin">Solo de fin</option>
                        </select>
                        <button
                          className="btn"
                          style={{ background: '#3D9FD3', color: 'black', padding: 0, width: '58px', height: '44px', border: '2px solid black', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', borderRadius: '8px', cursor: 'pointer' }}
                          onClick={fetchReservations}
                          title="Recargar reservaciones"
                        >
                          ⟳
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {loadingRes && <p className="res-status">Cargando reservaciones…</p>}
                {errorRes && <p className="res-status res-error">{errorRes}</p>}
                {!loadingRes && !errorRes && filteredReservations.length === 0 && <p className="res-status">No se encontraron reservaciones con estos filtros.</p>}
                <div className="reservations-list admin-reservations-list">
                  {filteredReservations.map(r => (
                    <div key={r._id} className="reservation-card">
                      <div className="reservation-card-header">
                        <span className="res-vehicle-name"> {getVehicleName(r.vehiculo)}</span>
                        <span className="status-badge" style={{ backgroundColor: ESTADO_RES_COLORS[r.estado] ?? '#6b7280' }}>
                          {r.estado.charAt(0).toUpperCase() + r.estado.slice(1).replace('_', ' ')}
                        </span>
                      </div>
                      <div className="reservation-card-info">
                        {user?.rol === 'admin' && (
                          <span> <strong>Usuario:</strong> {typeof r.usuario === 'object' && r.usuario !== null ? `${(r.usuario as any).nombre} ${(r.usuario as any).apellido}` : 'Desconocido'}</span>
                        )}
                        <span> <strong>Inicio:</strong> {new Date(r.fechaInicio).toLocaleDateString('es-CL')}</span>
                        <span> <strong>Fin:</strong>    {new Date(r.fechaFin).toLocaleDateString('es-CL')}</span>
                        {r.destino && <span> <strong>Destino:</strong> {r.destino}</span>}
                      </div>
                      <button className="btn" style={{ marginTop: '1rem', width: '100%' }} onClick={() => setSelectedReservation(r)}>
                        Ver Reservación
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h1 style={{ textAlign: 'center', marginTop: '1rem', marginBottom: '1.5rem', fontSize: '2rem', color: 'var(--text-h)' }}>
                  Crear Nueva Reservación
                </h1>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '3rem', maxWidth: '1300px', margin: '0 auto', flexWrap: 'wrap' }}>
                  <div className="filter-panel" style={{ padding: '2.5rem', borderRadius: '12px', width: '100%', flex: '1', minWidth: '400px', maxWidth: '900px', boxSizing: 'border-box' }}>
                    {createResError && <p className="reserv-field-error" style={{ marginBottom: '1rem', color: '#ef4444', textAlign: 'center' }}>{createResError}</p>}
                    <form onSubmit={handleCreateReservationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ marginBottom: '1rem' }}>
                        <label className="reserv-label" style={{ fontWeight: '600', display: 'block', marginBottom: '0.2rem', textAlign: 'center' }}>Usuario</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <select className="reserv-input" style={{ flex: 1, boxSizing: 'border-box', height: '36px', padding: '0.25rem 0.5rem' }} value={createResForm.usuarioId} onChange={e => setCreateResForm({ ...createResForm, usuarioId: e.target.value })} required>
                            <option value="me">Para mí (Administrador)</option>
                            {users.filter(u => u.activo).map(u => (
                              <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>
                            ))}
                          </select>
                          {(() => {
                            const selectedUser = createResForm.usuarioId === 'me' ? user : users.find(u => u.id === createResForm.usuarioId);
                            if (selectedUser?.banderaActual) {
                              return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', color: 'var(--text-p)' }}>

                                  <span style={{ display: 'inline-block', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: selectedUser.banderaActual === 'verde' ? '#22c55e' : selectedUser.banderaActual === 'amarilla' ? '#eab308' : selectedUser.banderaActual === 'naranja' ? '#f97316' : '#ef4444', border: '2px solid #000' }} title={`Bandera ${selectedUser.banderaActual}`} />
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        {(() => {
                          const selectedUser = createResForm.usuarioId === 'me' ? user : users.find(u => u.id === createResForm.usuarioId);
                          if (selectedUser?.banderaActual === 'roja') {
                            return (
                              <div style={{ marginTop: '0.5rem', color: '#b91c1c', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#fef2f2', padding: '0.5rem', borderRadius: '4px', border: '1px solid #f87171' }}>
                                ⚠️ Advertencia: Este usuario tiene bandera ROJA. Por favor revise su historial antes de autorizar el vehículo.
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div>
                        <label className="reserv-label" style={{ fontWeight: '600', display: 'block', marginBottom: '0.2rem', textAlign: 'center' }}>Vehículo</label>
                        <select className="reserv-input" style={{ width: '100%', boxSizing: 'border-box', height: '36px', padding: '0.25rem 0.5rem' }} value={createResForm.vehiculoId} onChange={e => setCreateResForm({ ...createResForm, vehiculoId: e.target.value })} required>
                          <option value="">Seleccione un vehículo</option>
                          {vehicles.filter(v => v.estado === 'disponible').map(v => (
                            <option key={v._id} value={v._id}>{v.marca} {v.modelo} - {v.placa}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <label className="reserv-label" style={{ fontWeight: '600', display: 'block', marginBottom: '0.2rem', textAlign: 'center' }}>Fecha de Inicio</label>
                          <input type="date" className="reserv-input" style={{ width: '100%', boxSizing: 'border-box', height: '36px', padding: '0.25rem 0.5rem' }} value={createResForm.fechaInicio} onChange={e => setCreateResForm({ ...createResForm, fechaInicio: e.target.value })} required />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label className="reserv-label" style={{ fontWeight: '600', display: 'block', marginBottom: '0.2rem', textAlign: 'center' }}>Fecha de Fin</label>
                          <input type="date" className="reserv-input" style={{ width: '100%', boxSizing: 'border-box', height: '36px', padding: '0.25rem 0.5rem' }} value={createResForm.fechaFin} onChange={e => setCreateResForm({ ...createResForm, fechaFin: e.target.value })} required />
                        </div>
                      </div>
                      <div>
                        <label className="reserv-label" style={{ fontWeight: '600', display: 'block', marginBottom: '0.2rem', textAlign: 'center' }}>Destino</label>
                        <input type="text" className="reserv-input" style={{ width: '100%', boxSizing: 'border-box', height: '36px', padding: '0.25rem 0.5rem' }} value={createResForm.destino} onChange={e => setCreateResForm({ ...createResForm, destino: e.target.value })} required placeholder="Ej: Santiago Centro" />
                      </div>
                      <div>
                        <label className="reserv-label" style={{ fontWeight: '600', display: 'block', marginBottom: '0.2rem', textAlign: 'center' }}>Motivo</label>
                        <textarea className="reserv-textarea" style={{ width: '100%', boxSizing: 'border-box', minHeight: '60px', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-p)' }} value={createResForm.motivo} onChange={e => setCreateResForm({ ...createResForm, motivo: e.target.value })} required placeholder="Describa el motivo de uso..." />
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', justifyContent: 'center' }}>
                        <button type="submit" className="btn" disabled={isCreatingRes} style={{ background: 'linear-gradient(to right, #3D9FD3, #FFFFFF, #B5B8BE)', color: 'black', border: '2px solid black', borderRadius: '8px', padding: '0.5rem 1rem', margin: 0 }}>
                          {isCreatingRes ? 'Creando...' : 'Crear Reservación'}
                        </button>
                        <button type="button" className="btn" onClick={() => setShowCreateRes(false)} disabled={isCreatingRes} style={{ background: 'rgba(239, 68, 68, 0.75)', color: 'black', border: '2px solid black', borderRadius: '8px', padding: '0.5rem 1rem', margin: 0 }}>Cancelar</button>
                      </div>
                    </form>
                  </div>
                  {vehicles.find(v => v._id === createResForm.vehiculoId) && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', border: '2px solid #ccc', borderRadius: '8px', padding: '1.5rem', backgroundColor: 'var(--bg-panel)', width: '400px', boxSizing: 'border-box', marginTop: '4.5rem' }}>
                      <img
                        src={getVehicleImage(vehicles.find(v => v._id === createResForm.vehiculoId)!)}
                        alt={`Vehículo seleccionado`}
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
        )}

        {/* ══════════ TAB: VEHÍCULOS ACTIVOS ══════════ */}
        {activeTab === 'vehiculos-activos' && (
          <div style={{ width: '100%' }}>
            <ActiveVehiclesMap token={token} isAdmin={user?.rol === 'admin'} />
          </div>
        )}

        {/* ══════════ TAB: VEHÍCULOS ══════════ */}
        {activeTab === 'vehiculos' && (
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700', color: '#000' }}>   Vehículos</h2>
              <button className="btn btn-create" onClick={() => { setVehicleForm(EMPTY_VEHICLE_FORM); setShowCreateVehicle(true); }}>
                Agregar Vehículo
              </button>
            </div>

            {loadingVehicles && <p className="res-status">Cargando vehículos…</p>}
            {!loadingVehicles && vehicles.length === 0 && <p className="res-status">No hay vehículos registrados.</p>}

            <div className="vehicles-grid" style={{ maxWidth: '100%' }}>
              {vehicles.map(v => {
                const imgUrl = getVehicleImage(v);
                return (
                  <div key={v._id} className="vehicle-card">
                    <img src={imgUrl} alt={`${v.marca} ${v.modelo}`} className="vehicle-card-img" />
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
                          <div style={{ marginTop: '0.5rem', marginBottom: '0.2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                              <strong>Bencina:</strong> <span>{v.nivelBencina}%</span>
                            </div>
                            <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: '4px', height: '6px' }}>
                              <div style={{ width: `${v.nivelBencina}%`, backgroundColor: v.nivelBencina > 50 ? '#10b981' : v.nivelBencina > 20 ? '#f59e0b' : '#ef4444', height: '100%', borderRadius: '4px' }} />
                            </div>
                          </div>
                        )}
                        {v.ultimoMantenimiento && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '4px' }}>
                            <strong>Último Mantenimiento:</strong>
                            <span>{new Date(v.ultimoMantenimiento).toLocaleString('es-CL')}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="status-badge" style={{ backgroundColor: ESTADO_VEHICLE_COLORS[v.estado] }}>
                          {ESTADO_VEHICLE_LABELS[v.estado]}
                        </span>
                      </div>
                      <div style={{ textAlign: 'center', marginTop: '15px' }}>
                        <button
                          id={`ver-vehiculo-admin-${v._id}`}
                          className="btn"
                          style={{ margin: 0, padding: '10px 32px', fontSize: '1rem' }}
                          onClick={() => setSelectedVehicle(v)}
                        >
                          Ver Vehículo
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════ TAB: INSPECCIONES ALEATORIAS ══════════ */}
        {activeTab === 'inspecciones' && (
          <RandomInspectionsPanel token={token} users={users} vehicles={vehicles} />
        )}

        {/* ══════════ TAB: REPORTES DE GASTOS (MOCK) ══════════ */}
        {activeTab === 'reportes' && (
          <div className="reportes-panel" style={{ width: '100%' }}>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-h)', marginBottom: '1.5rem' }}>Reportes de Gastos por Departamento</h2>

            {/* KPIs Globales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="filter-panel stat-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                <h3 style={{ marginTop: 0, color: 'var(--text-h)' }}>Gasto Total Estimado</h3>
                <div className="value" style={{ color: 'var(--text-h)', fontSize: '1.8rem', fontWeight: 'bold' }}>$345.000</div>
                <div className="label" style={{ color: 'var(--text-p)' }}>Mes actual</div>
              </div>
              <div className="filter-panel stat-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                <h3 style={{ marginTop: 0, color: 'var(--text-h)' }}>Departamento Mayor Gasto</h3>
                <div className="value" style={{ color: '#3b82f6', fontSize: '1.8rem', fontWeight: 'bold' }}>Ventas</div>
                <div className="label" style={{ color: 'var(--text-p)' }}>12 Reservas completadas</div>
              </div>
              <div className="filter-panel stat-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                <h3 style={{ marginTop: 0, color: 'var(--text-h)' }}>Total Km Recorridos</h3>
                <div className="value" style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-h)' }}>2.300 km</div>
                <div className="label" style={{ color: 'var(--text-p)' }}>Todos los departamentos</div>
              </div>
            </div>

            {/* Filtros */}
            <div className="filter-panel" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'nowrap', width: 'fit-content', margin: '0 auto', padding: '0.4rem 1rem', borderRadius: '16px' }}>
              <div style={{ width: '180px' }}>
                <label className="reserv-label" style={{ fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>Mes</label>
                <select className="reserv-input" style={{ width: '100%', boxSizing: 'border-box', height: '45px' }}>
                  <option>Agosto 2026</option>
                  <option>Julio 2026</option>
                  <option>Junio 2026</option>
                </select>
              </div>
              <div style={{ width: '180px' }}>
                <label className="reserv-label" style={{ fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>Desde</label>
                <input type="date" className="reserv-input" defaultValue="2026-08-01" style={{ width: '100%', boxSizing: 'border-box', height: '45px' }} />
              </div>
              <div style={{ width: '180px' }}>
                <label className="reserv-label" style={{ fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>Hasta</label>
                <input type="date" className="reserv-input" defaultValue="2026-08-31" style={{ width: '100%', boxSizing: 'border-box', height: '45px' }} />
              </div>
              <button className="btn" style={{ padding: '0 1.2rem', height: '45px', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={exportToCSV}>
                <span></span> Exportar Excel
              </button>
            </div>

            {/* Gráfico y Tabla */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
              <div className="filter-panel" style={{ borderRadius: '12px' }}>
                <h3 style={{ margin: 0, color: '#fff', backgroundColor: '#175fbd', padding: '12px 16px', borderRadius: '12px 12px 0 0', marginBottom: '1rem' }}>Costo Estimado por Departamento ($)</h3>
                <div style={{ width: '100%', height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={MOCK_REPORTES_DATA} margin={{ top: 20 }}>
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-p)' }} stroke="var(--border)" />
                      <YAxis hide />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }} itemStyle={{ color: 'var(--text-p)', textAlign: 'center' }} labelStyle={{ color: 'var(--text-h)', textAlign: 'center' }} formatter={(val: number) => `$${val.toLocaleString('es-CL')}`} />
                      <Bar dataKey="costo" fill="#3D9FD3" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="costo" position="insideTop" fill="#fff" formatter={(val: number) => `$${val.toLocaleString('es-CL')}`} offset={15} style={{ fontWeight: 'bold', fontSize: '0.9rem' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="filter-panel" style={{ borderRadius: '12px', overflowX: 'auto' }}>
                <h3 style={{ margin: 0, color: '#fff', backgroundColor: '#175fbd', padding: '12px 16px', borderRadius: '12px 12px 0 0' }}>Detalle por Departamento</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-p)' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th style={{ backgroundColor: '#48a2d3ff', padding: '0.3rem', textAlign: 'left' }}>Departamento</th>
                      <th style={{ backgroundColor: '#48a2d3ff', padding: '0.3rem', textAlign: 'left' }}>Reservas</th>
                      <th style={{ backgroundColor: '#48a2d3ff', padding: '0.3rem', textAlign: 'left' }}>Km Totales</th>
                      <th style={{ backgroundColor: '#48a2d3ff', padding: '0.3rem', textAlign: 'left' }}>Horas Uso</th>
                      <th style={{ backgroundColor: '#48a2d3ff', padding: '0.3rem', textAlign: 'left' }}>Costo Total ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_REPORTES_DATA.map((d, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 'bold', textAlign: 'left' }}>{d.name}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'left' }}>{d.res}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'left' }}>{d.km} km</td>
                        <td style={{ padding: '0.5rem', textAlign: 'left' }}>{d.horas} hrs</td>
                        <td style={{ padding: '0.5rem', color: 'var(--text-h)', fontWeight: 'bold', textAlign: 'left' }}>${d.costo.toLocaleString('es-CL')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'perfil' && (
          <div style={{ width: '100%', textAlign: 'center', padding: '4rem', backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
            <h2 style={{ color: 'var(--text-h)' }}>Configuración de Perfil</h2>
            <p style={{ color: 'var(--text-p)', fontSize: '1.1rem' }}>Módulo en desarrollo. Próximamente podrás configurar los detalles de tu cuenta de administrador aquí.</p>
          </div>
        )}

        {activeTab === 'soporte' && (
          <div style={{ width: '100%', textAlign: 'center', padding: '4rem', backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
            <h2 style={{ color: 'var(--text-h)' }}>Soporte Técnico</h2>
            <p style={{ color: 'var(--text-p)', fontSize: '1.1rem' }}>Módulo en desarrollo. Próximamente dispondrás de opciones para contactar al soporte técnico del sistema.</p>
          </div>
        )}
      </main>

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
              {selectedVehicle.marca} {selectedVehicle.modelo}
            </h2>

            {/* Layout imagen + datos */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {/* Imagen */}
              <div style={{ flex: '0 0 auto' }}>
                <img
                  src={getVehicleImage(selectedVehicle)}
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
                {selectedVehicle.nivelBencina !== undefined && (
                  <div style={{ marginTop: '0.2rem', marginBottom: '0.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', marginBottom: '4px' }}>
                      <strong>Nivel de Bencina:</strong> <span>{selectedVehicle.nivelBencina}%</span>
                    </div>
                    <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: '6px', height: '8px' }}>
                      <div style={{ width: `${selectedVehicle.nivelBencina}%`, backgroundColor: selectedVehicle.nivelBencina > 50 ? '#10b981' : selectedVehicle.nivelBencina > 20 ? '#f59e0b' : '#ef4444', height: '100%', borderRadius: '6px' }} />
                    </div>
                  </div>
                )}
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
                  <button className="btn" style={{ background: 'rgba(239, 68, 68, 0.75)', color: 'black', padding: '0.5rem 2rem', border: '2px solid black' }} onClick={() => deleteVehicle(selectedVehicle._id)}>Sí</button>
                  <button className="btn" style={{ backgroundColor: '#175fbd', color: 'black', padding: '0.5rem 2rem' }} onClick={() => setShowDeleteVehicleConfirm(null)}>No</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem', flexWrap: 'wrap' }}>
                <button className="btn" style={{ backgroundColor: '#175fbd', color: 'black', padding: '0.6rem 1.8rem' }} onClick={() => openEditVehicle(selectedVehicle)}> Editar</button>
                <button className="btn" style={{ background: 'rgba(239, 68, 68, 0.75)', color: 'black', padding: '0.6rem 1.8rem', border: '2px solid black' }} onClick={() => setShowDeleteVehicleConfirm(selectedVehicle._id)}> Eliminar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ MODAL: CREAR VEHÍCULO ══════════ */}
      {showCreateVehicle && (
        <div className="modal-overlay" onClick={() => setShowCreateVehicle(false)}>
          <div className="modal-content" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '580px', width: '95%', color: '#000', textAlign: 'left', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowCreateVehicle(false)} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>X</button>
            <h2 style={{ marginTop: 0, marginBottom: '1.25rem', textAlign: 'center' }}> Agregar Vehículo</h2>
            <form onSubmit={createVehicle}>
              {renderVehicleFormFields()}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'center' }}>
                <button type="submit" className="btn" style={{ backgroundColor: '#175fbd', color: 'black' }}> Crear</button>
                <button type="button" className="btn" style={{ background: 'rgba(239, 68, 68, 0.75)', color: 'black', border: '2px solid black' }} onClick={() => setShowCreateVehicle(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: EDITAR VEHÍCULO ══════════ */}
      {showEditVehicle && (
        <div className="modal-overlay" onClick={() => setShowEditVehicle(null)}>
          <div className="modal-content" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '580px', width: '95%', color: '#000', textAlign: 'left', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowEditVehicle(null)} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>X</button>
            <h2 style={{ marginTop: 0, marginBottom: '1.25rem', textAlign: 'center' }}> Editar Vehículo</h2>
            {renderVehicleFormFields()}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'center' }}>
              <button className="btn" style={{ backgroundColor: '#175fbd', color: 'black' }} onClick={saveEditVehicle}> Guardar</button>
              <button className="btn" style={{ background: 'rgba(239, 68, 68, 0.75)', color: 'black', border: '2px solid black' }} onClick={() => setShowEditVehicle(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: DETALLE RESERVACIÓN ══════════ */}
      {selectedReservation && (
        <div className="modal-overlay" onClick={() => { setSelectedReservation(null); setShowRejectForm(false); setRejectReason(''); }}>
          <div className="modal-content" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '520px', width: '90%', color: '#000', textAlign: 'center', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setSelectedReservation(null); setShowRejectForm(false); setRejectReason(''); }} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>X</button>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Detalles de Reservación</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', textAlign: 'left', fontSize: '1.05rem' }}>
              {user?.rol === 'admin' && typeof selectedReservation.usuario === 'object' && selectedReservation.usuario !== null && (
                <p style={{ margin: 0 }}><strong>Usuario:</strong> {(selectedReservation.usuario as any).nombre} {(selectedReservation.usuario as any).apellido}</p>
              )}
              <p style={{ margin: 0 }}><strong>Vehículo:</strong> {getVehicleName(selectedReservation.vehiculo)}</p>
              {typeof selectedReservation.vehiculo === 'object' && selectedReservation.vehiculo !== null && (selectedReservation.vehiculo as any).placa && (
                <p style={{ margin: 0 }}><strong>Patente:</strong> {(selectedReservation.vehiculo as any).placa}</p>
              )}
              <p style={{ margin: 0 }}>
                <strong>Estado:</strong>{' '}
                <span className="status-badge" style={{ backgroundColor: ESTADO_RES_COLORS[selectedReservation.estado] ?? '#6b7280' }}>
                  {selectedReservation.estado.charAt(0).toUpperCase() + selectedReservation.estado.slice(1).replace('_', ' ')}
                </span>
              </p>
              <p style={{ margin: 0 }}><strong>Inicio:</strong> {new Date(selectedReservation.fechaInicio).toLocaleString('es-CL')}</p>
              <p style={{ margin: 0 }}><strong>Fin:</strong>    {new Date(selectedReservation.fechaFin).toLocaleString('es-CL')}</p>
              {selectedReservation.destino && <p style={{ margin: 0 }}><strong>Destino:</strong> {selectedReservation.destino}</p>}
              {selectedReservation.motivo && <p style={{ margin: 0 }}><strong>Motivo:</strong>  {selectedReservation.motivo}</p>}
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

              {selectedReservation.fotosSalida && selectedReservation.fotosSalida.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <strong>Fotos de Inicio del Viaje:</strong>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {selectedReservation.fotosSalida.map((foto, idx) => {
                      const PHOTO_LABELS = ['Frontal', 'Lateral Derecho', 'Lateral Izquierdo', 'Trasero', 'Tablero', 'Interior'];
                      const label = PHOTO_LABELS[idx] || `Extra ${idx + 1}`;
                      const imgSrc = foto.startsWith('http') ? foto : `http://localhost:5000${foto}`;
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100px' }}>
                          <img src={imgSrc} alt={label} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ccc', cursor: 'pointer' }} onClick={() => setFullScreenImage(imgSrc)} />
                          <span style={{ fontSize: '0.75rem', marginTop: '6px', color: '#555', textAlign: 'center', fontWeight: 'bold' }}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedReservation.fotosRetorno && selectedReservation.fotosRetorno.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <strong>Fotos de Fin del Viaje:</strong>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {selectedReservation.fotosRetorno.map((foto, idx) => {
                      const PHOTO_LABELS = ['Frontal', 'Lateral Derecho', 'Lateral Izquierdo', 'Trasero', 'Tablero', 'Interior'];
                      const label = PHOTO_LABELS[idx] || `Extra ${idx + 1}`;
                      const imgSrc = foto.startsWith('http') ? foto : `http://localhost:5000${foto}`;
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100px' }}>
                          <img src={imgSrc} alt={label} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ccc', cursor: 'pointer' }} onClick={() => setFullScreenImage(imgSrc)} />
                          <span style={{ fontSize: '0.75rem', marginTop: '6px', color: '#555', textAlign: 'center', fontWeight: 'bold' }}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {selectedReservation.estado === 'pendiente' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {!showRejectForm && (
                  <button
                    className="btn"
                    style={{ backgroundColor: '#22c55e', color: 'black', width: '100%', fontSize: '1rem', padding: '0.7rem' }}
                    disabled={approvingId === selectedReservation._id || isRejecting}
                    onClick={() => approveReservation(selectedReservation._id)}
                  >
                    {approvingId === selectedReservation._id ? 'Aprobando…' : '✅ Aprobar Reservación'}
                  </button>
                )}

                {showRejectForm ? (
                  <div style={{ marginTop: '10px', textAlign: 'left', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Escriba el motivo del Rechazo:</label>
                    <textarea
                      style={{ width: '100%', padding: '8px', boxSizing: 'border-box', minHeight: '60px', borderRadius: '4px', border: '1px solid #ccc' }}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Motivo del rechazo..."
                    />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button
                        className="btn"
                        style={{ backgroundColor: '#3b82f6', color: 'black', border: '2px solid black', flex: 1, padding: '0.7rem' }}
                        onClick={() => rejectReservation(selectedReservation._id)}
                        disabled={isRejecting}
                      >
                        {isRejecting ? 'Enviando...' : 'Enviar Rechazo'}
                      </button>
                      <button
                        className="btn"
                        style={{ backgroundColor: '#ef4444', color: 'black', border: '2px solid black', flex: 1, padding: '0.7rem' }}
                        onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
                        disabled={isRejecting}
                      >
                        Cancelar Rechazo
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn"
                    style={{ backgroundColor: '#ef4444', color: 'black', width: '100%', fontSize: '1rem', padding: '0.7rem', border: '2px solid black' }}
                    onClick={() => setShowRejectForm(true)}
                  >
                    ❌ Rechazar Aprobación
                  </button>
                )}
              </div>
            ) : (
              <p style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '0.95rem' }}>
                Esta reservación ya no está pendiente de aprobación.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ══════════ MODAL: VER USUARIO ══════════ */}
      {viewUser && (
        <div className="modal-overlay" onClick={() => setViewUser(null)}>
          <div className="modal-content" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '480px', width: '90%', color: '#000', textAlign: 'left', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewUser(null)} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>X</button>
            <h2 style={{ marginTop: 0, marginBottom: '1.25rem', textAlign: 'center' }}>Detalles del Usuario</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '1.05rem' }}>
              <p style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <strong>Nombre:</strong> <span style={{ marginLeft: '4px' }}>{viewUser.nombre} {viewUser.apellido}</span>
                {viewUser.banderaActual && (
                  <span style={{
                    display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%',
                    backgroundColor: viewUser.banderaActual === 'verde' ? '#22c55e' : viewUser.banderaActual === 'amarilla' ? '#eab308' : viewUser.banderaActual === 'naranja' ? '#f97316' : '#ef4444',
                    border: '1px solid #fff', boxShadow: '0 0 0 1px #ccc', marginLeft: '8px'
                  }} title={`Bandera ${viewUser.banderaActual}`} />
                )}
              </p>
              <p style={{ margin: 0 }}><strong>Email:</strong> {viewUser.email}</p>
              <p style={{ margin: 0 }}><strong>Departamento:</strong> {viewUser.departamento}</p>
              <p style={{ margin: 0 }}><strong>Teléfono:</strong> {viewUser.telefono || 'N/A'}</p>
              <p style={{ margin: 0 }}><strong>Rol:</strong> {viewUser.rol === 'admin' ? 'Administrador' : 'Usuario'}</p>
              <p style={{ margin: 0 }}><strong>Licencia:</strong> {viewUser.licenciaAlDia ? 'Al Día' : 'No Al Día'}</p>

              {viewUser.historialBanderas && viewUser.historialBanderas.length > 0 && (
                <div style={{ marginTop: '0.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>Historial de Banderas</h4>
                  <ul style={{ paddingLeft: '0', listStyleType: 'none', margin: 0, fontSize: '0.95rem' }}>
                    {viewUser.historialBanderas.map((bandera, i) => (
                      <li key={i} style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{
                          display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0, marginTop: '4px',
                          backgroundColor: bandera.tipo === 'verde' ? '#22c55e' : bandera.tipo === 'amarilla' ? '#eab308' : bandera.tipo === 'naranja' ? '#f97316' : '#ef4444'
                        }} />
                        <div>
                          <strong>{new Date(bandera.fecha).toLocaleDateString('es-CL')}</strong>: {bandera.motivo}
                          {bandera.asignadoPor && <span style={{ color: '#6b7280', fontSize: '0.85rem' }}> (por {bandera.asignadoPor})</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              {viewUser.rol !== 'admin' ? (
                <>
                  <button className="btn" style={{ backgroundColor: '#175fbd', color: 'black' }} onClick={() => { setViewUser(null); openEdit(viewUser); }}>Editar</button>
                  <button className="btn" style={{ background: 'rgba(239, 68, 68, 0.75)', color: 'black', border: '2px solid black' }} onClick={() => { setViewUser(null); setShowDeleteUserConfirm(viewUser.id); }}>Eliminar</button>
                </>
              ) : (
                <span style={{ fontSize: '0.9rem', color: '#888', fontStyle: 'italic', padding: '0.5rem' }}>Usuario protegido (no se puede editar ni eliminar)</span>
              )}
            </div>
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
              {(['nombre', 'apellido', 'email', 'departamento', 'telefono'] as const).map(field => (
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
                <label style={{ fontWeight: '600', color: editForm.activo ? '#22c55e' : '#ef4444', minWidth: '70px' }}>{editForm.activo ? 'Activo' : 'Inactivo'}:</label>
                <input type="checkbox" checked={editForm.activo} onChange={e => setEditForm(f => ({ ...f, activo: e.target.checked }))} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: editForm.activo ? '#22c55e' : '#ef4444' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'center' }}>
              <button className="btn" style={{ backgroundColor: '#175fbd', color: 'black' }} onClick={saveEdit}> Guardar</button>
              <button className="btn" style={{ background: 'rgba(239, 68, 68, 0.75)', color: 'black', border: '2px solid black' }} onClick={() => setEditUser(null)}>Cancelar</button>
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
              <button className="btn" style={{ background: 'rgba(239, 68, 68, 0.75)', color: 'black', padding: '0.5rem 2rem', border: '2px solid black' }} onClick={() => deleteUser(showDeleteUserConfirm)}>Sí</button>
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
              {([['nombre', 'Nombre'], ['apellido', 'Apellido'], ['email', 'Email'], ['password', 'Contraseña'], ['departamento', 'Departamento'], ['telefono', 'Teléfono']] as [keyof typeof createForm, string][]).map(([field, label]) => (
                <div key={field}>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>{label}:</label>
                  <input className="reserv-input" style={{ width: '100%', boxSizing: 'border-box' }} type={field === 'password' ? 'password' : 'text'} value={createForm[field]} onChange={e => setCreateForm(f => ({ ...f, [field]: e.target.value }))} required={field !== 'departamento' && field !== 'telefono'} />
                </div>
              ))}
              <div>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Rol:</label>
                <select className="reserv-select" value={createForm.rol} onChange={e => setCreateForm(f => ({ ...f, rol: e.target.value as 'usuario' | 'admin' }))}>
                  <option value="usuario">Usuario</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>Foto de la Licencia:</label>
                <input className="reserv-input" style={{ width: '100%', boxSizing: 'border-box' }} type="file" accept="image/*" onChange={e => setCreateUserLicenciaFile(e.target.files?.[0] || null)} required />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
                <button type="submit" className="btn" style={{ backgroundColor: '#175fbd', color: 'black' }}>➕ Crear</button>
                <button type="button" className="btn" style={{ background: 'rgba(239, 68, 68, 0.75)', color: 'black', border: '2px solid black' }} onClick={() => setShowCreateUser(false)}>Cancelar</button>
              </div>
            </form>
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
                onClick={handleLogout}
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

      {/* ── Modal Imagen Full Screen ── */}
      {fullScreenImage && (
        <div
          className="modal-overlay"
          style={{ zIndex: 9999, padding: '2rem' }}
          onClick={() => setFullScreenImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setFullScreenImage(null)}
              style={{ position: 'absolute', top: '-15px', right: '-15px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >
              X
            </button>
            <img src={fullScreenImage} alt="Vista ampliada" style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
