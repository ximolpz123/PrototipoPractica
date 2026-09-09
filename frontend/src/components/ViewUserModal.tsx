import { useState } from 'react';
import type { IUser } from '../types';
import { userService } from '../services/user.service';

interface ViewUserModalProps {
  user: IUser;
  token: string | null;
  onClose: () => void;
  onEdit: (user: IUser) => void;
  onDelete: (id: string) => void;
  onUpdateSuccess: (updatedUser: IUser) => void;
  currentUserRole: string;
}

export function ViewUserModal({ user, onClose, onEdit, onDelete, onUpdateSuccess, currentUserRole }: ViewUserModalProps) {
  const [flagTipo, setFlagTipo] = useState<'verde' | 'amarilla' | 'naranja' | 'roja'>('verde');
  const [flagMotivo, setFlagMotivo] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isInvalidating, setIsInvalidating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleAssignFlag = async () => {
    if (!flagMotivo.trim()) {
      setError('Debes ingresar un motivo para la bandera.');
      return;
    }
    setIsAssigning(true);
    setMessage('');
    setError('');
    try {
      await userService.assignFlag(user.id, flagTipo, flagMotivo);
      setMessage(`Bandera ${flagTipo} asignada correctamente.`);

      // Update local user state representation
      const updatedUser = { ...user, banderaActual: flagTipo };
      if (!updatedUser.historialBanderas) updatedUser.historialBanderas = [];
      updatedUser.historialBanderas.unshift({
        tipo: flagTipo,
        motivo: flagMotivo,
        asignadoPor: 'admin',
        fecha: new Date().toISOString()
      });

      onUpdateSuccess(updatedUser);
      setFlagMotivo('');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al asignar bandera');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleInvalidateLicense = async () => {
    if (!window.confirm(`¿Estás seguro de que quieres invalidar la licencia de ${user.nombre}? Esta acción impedirá que el usuario rente vehículos.`)) {
      return;
    }
    setIsInvalidating(true);
    setMessage('');
    setError('');
    try {
      const result = await userService.invalidateLicencia(user.id);
      setMessage('Licencia invalidada correctamente.');
      onUpdateSuccess(result.user);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al invalidar licencia');
    } finally {
      setIsInvalidating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '600px', width: '90%', color: '#000', textAlign: 'left', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
        <h2 style={{ marginTop: 0, marginBottom: '1.25rem', textAlign: 'center' }}>Detalles del Usuario</h2>

        {message && <p style={{ color: '#22c55e', fontWeight: 'bold', textAlign: 'center' }}>{message}</p>}
        {error && <p style={{ color: '#ef4444', fontWeight: 'bold', textAlign: 'center' }}>{error}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '1.05rem' }}>
          <p style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
            <strong>Nombre:</strong> <span style={{ marginLeft: '4px' }}>{user.nombre} {user.apellido}</span>
            {(() => {
              const currentFlag = user.banderaActual || 'verde';
              return (
                <span style={{
                  display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%',
                  backgroundColor: currentFlag === 'verde' ? '#22c55e' : currentFlag === 'amarilla' ? '#eab308' : currentFlag === 'naranja' ? '#f97316' : '#ef4444',
                  border: '1px solid #fff', boxShadow: '0 0 0 1px #ccc', marginLeft: '8px'
                }} title={`Bandera ${currentFlag}`} />
              );
            })()}
          </p>
          <p style={{ margin: 0 }}><strong>Email:</strong> {user.email}</p>
          <p style={{ margin: 0 }}><strong>Departamento:</strong> {user.departamento}</p>
          <p style={{ margin: 0 }}>
            <strong>Teléfono:</strong> {user.telefono ? (() => {
              const clean = user.telefono.replace(/\s+/g, '');
              if (clean.startsWith('+569') && clean.length === 12) {
                return `+569 ${clean.slice(4, 8)} ${clean.slice(8)}`;
              }
              return user.telefono;
            })() : 'N/A'}
          </p>
          <p style={{ margin: 0 }}><strong>Rol:</strong> {user.rol === 'admin' ? 'Administrador' : 'Usuario'}</p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(128, 128, 128, 0.2)', padding: '0.5rem', borderRadius: '4px' }}>
            <p style={{ margin: 0 }}>
              <strong>Licencia:</strong> <span className="status-badge" style={{ backgroundColor: user.licenciaAlDia ? '#22c55e' : '#ef4444' }}>{user.licenciaAlDia ? 'Al Día' : 'No Al Día'}</span>
            </p>
            {user.licenciaAlDia && currentUserRole === 'admin' && (
              <button className="btn btn-sm" style={{ backgroundColor: '#ef4444', color: 'black', border: '1px solid black', margin: 0 }} onClick={handleInvalidateLicense} disabled={isInvalidating}>
                {isInvalidating ? 'Invalidando...' : 'Invalidar Licencia'}
              </button>
            )}
          </div>

          {currentUserRole === 'admin' && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>Asignar Nueva Bandera (Sanción/Alerta)</h4>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <select className="reserv-select" value={flagTipo} onChange={e => setFlagTipo(e.target.value as any)} style={{ flex: 1 }}>
                  <option value="verde">Verde (Sin faltas)</option>
                  <option value="amarilla">Amarilla (Alerta)</option>
                  <option value="naranja">Naranja (Grave)</option>
                  <option value="roja">Roja (Bloqueo)</option>
                </select>
                <input type="text" className="reserv-input" placeholder="Motivo (ej. Choque, Atraso)" value={flagMotivo} onChange={e => setFlagMotivo(e.target.value)} style={{ flex: 2 }} />
                <button className="btn" style={{ margin: 0, backgroundColor: '#3b82f6', color: 'black', border: '1px solid black' }} onClick={handleAssignFlag} disabled={isAssigning}>
                  {isAssigning ? 'Asignando...' : 'Asignar'}
                </button>
              </div>
            </div>
          )}

          {user.historialBanderas && user.historialBanderas.length > 0 && (
            <div style={{ marginTop: '0.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>Historial de Banderas</h4>
              <ul style={{ paddingLeft: '0', listStyleType: 'none', margin: 0, fontSize: '0.95rem', maxHeight: '150px', overflowY: 'auto' }}>
                {user.historialBanderas.map((bandera, i) => (
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
          {user.rol !== 'admin' ? (
            <>
              <button className="btn" style={{ backgroundColor: '#175fbd', color: 'black' }} onClick={() => onEdit(user)}>Editar</button>
              <button className="btn" style={{ background: 'rgba(239, 68, 68, 0.75)', color: 'black', border: '2px solid black' }} onClick={() => onDelete(user.id)}>Eliminar</button>
            </>
          ) : (
            <span style={{ fontSize: '0.9rem', color: '#888', fontStyle: 'italic', padding: '0.5rem' }}>Usuario protegido (no se puede editar ni eliminar)</span>
          )}
        </div>
      </div>
    </div>
  );
}
