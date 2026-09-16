import { useState, useRef } from 'react';
import type { IUser } from '../types';
import { userService } from '../services/user.service';

interface ProfilePanelProps {
  user: IUser | null;
  token: string | null;
  onUpdateUser: (user: IUser) => void;
}

export function ProfilePanel({ user, token, onUpdateUser }: ProfilePanelProps) {
  const [departamento, setDepartamento] = useState(user?.departamento || '');
  const [telefono, setTelefono] = useState(user?.telefono || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const [licenciaFile, setLicenciaFile] = useState<File | null>(null);
  const [licenciaLoading, setLicenciaLoading] = useState(false);
  const [licenciaMsg, setLicenciaMsg] = useState('');
  const [licenciaErr, setLicenciaErr] = useState('');
  const [modalImg, setModalImg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user || !token) return <p>Sesión inválida</p>;

  const handleUpdateProfile = async () => {
    setShowConfirm(false);
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const formData = new FormData();
      formData.append('departamento', departamento);
      formData.append('telefono', telefono);

      const updatedUser = await userService.updatePerfil(user.id, formData);
      onUpdateUser(updatedUser);
      setMessage('Perfil actualizado exitosamente.');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleUpdateLicencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenciaFile) {
      setLicenciaErr('Por favor selecciona una imagen de tu licencia.');
      return;
    }

    setLicenciaLoading(true);
    setLicenciaMsg('');
    setLicenciaErr('');
    try {
      const formData = new FormData();
      formData.append('licencia', licenciaFile);

      const result = await userService.updateLicencia(user.id, formData);
      onUpdateUser(result.user);
      setLicenciaMsg(result.message || 'Licencia validada y actualizada exitosamente.');
      setLicenciaFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setLicenciaErr(err.response?.data?.message || err.message || 'Error al validar la licencia. Verifica que la imagen sea nítida.');
    } finally {
      setLicenciaLoading(false);
    }
  };

  return (
    <>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-h)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Configuración de Perfil</h1>

        <div className="filter-panel" style={{ padding: '2rem', borderRadius: '12px', marginBottom: '2rem' }}>
          <h3 style={{ marginTop: 0, borderBottom: '1px solid #ccc', paddingBottom: '0.5rem' }}>Información Personal</h3>

          {message && <p style={{ color: '#22c55e', fontWeight: 'bold' }}>{message}</p>}
          {error && <p style={{ color: '#ef4444', fontWeight: 'bold' }}>{error}</p>}

          <form onSubmit={onFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label className="reserv-label">Nombre</label>
                <input type="text" className="reserv-input" value={user.nombre} disabled style={{ backgroundColor: '#f3f4f6', width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label className="reserv-label">Apellido</label>
                <input type="text" className="reserv-input" value={user.apellido} disabled style={{ backgroundColor: '#f3f4f6', width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label className="reserv-label">Email</label>
                <input type="email" className="reserv-input" value={user.email} disabled style={{ backgroundColor: '#f3f4f6', width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label className="reserv-label">Departamento</label>
                <input type="text" className="reserv-input" value={departamento} onChange={e => setDepartamento(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label className="reserv-label">Teléfono</label>
                <input type="text" className="reserv-input" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+56 9 1234 5678" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>

        <div className="filter-panel" style={{ padding: '2rem', borderRadius: '12px' }}>
          <h3 style={{ marginTop: 0, borderBottom: '1px solid #ccc', paddingBottom: '0.5rem' }}>Validación de Licencia de Conducir</h3>

          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', justifyContent: 'center', margin: '1.5rem 0' }}>
            {user.licenciaFotoUrl && (
              <img 
                src={user.licenciaFotoUrl} 
                alt="Licencia" 
                style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #9ca3af', cursor: 'pointer' }}
                onClick={() => setModalImg(user.licenciaFotoUrl as string)}
              />
            )}
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: '0 0 0.5rem 0' }}><strong>Estado Actual:</strong> <span className="status-badge" style={{ backgroundColor: user.licenciaAlDia ? '#22c55e' : '#ef4444' }}>{user.licenciaAlDia ? 'Vigente' : 'Inválida / Vencida'}</span></p>
              {user.licenciaVencimiento && (
                <p style={{ margin: 0 }}><strong>Vence el:</strong> {new Date(user.licenciaVencimiento).toLocaleDateString('es-CL')}</p>
              )}
            </div>
          </div>

          {!user.licenciaAlDia && (
            <form onSubmit={handleUpdateLicencia} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', padding: '1rem', border: '1px dashed #9ca3af', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>Tu licencia no está al día. Sube una fotografía clara de tu licencia (donde se lea la fecha de vencimiento) para validarla usando nuestro sistema automatizado.</p>

              {licenciaMsg && <p style={{ color: '#22c55e', fontWeight: 'bold', margin: 0 }}>{licenciaMsg}</p>}
              {licenciaErr && <p style={{ color: '#ef4444', fontWeight: 'bold', margin: 0 }}>{licenciaErr}</p>}

              <input type="file" accept="image/*" ref={fileInputRef} onChange={e => setLicenciaFile(e.target.files?.[0] || null)} required />

              <button type="submit" className="btn" disabled={licenciaLoading || !licenciaFile} style={{ alignSelf: 'flex-start', backgroundColor: '#3b82f6' }}>
                {licenciaLoading ? 'Validando con IA...' : 'Subir y Validar Licencia'}
              </button>
            </form>
          )}
        </div>
      </div>

      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal-content" style={{ backgroundColor: 'var(--bg-panel)', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '90%', color: 'var(--text-p)', textAlign: 'center', position: 'relative', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0' }}>¿Quiere guardar estos cambios?</h2>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn" style={{ backgroundColor: '#22c55e', color: 'black', padding: '0.5rem 2rem' }} onClick={handleUpdateProfile}>Sí</button>
              <button className="btn" style={{ background: 'rgba(239, 68, 68, 0.75)', color: 'black', border: '2px solid black', padding: '0.5rem 2rem' }} onClick={() => setShowConfirm(false)}>No</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver imagen ampliada */}
      {modalImg && (
        <div className="modal-overlay" onClick={() => setModalImg(null)} style={{ zIndex: 9999 }}>
          <img src={modalImg} alt="Vista ampliada" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px' }} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
