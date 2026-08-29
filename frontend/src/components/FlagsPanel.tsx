import { useState, useEffect, useCallback } from 'react';
import { flagService } from '../services/flag.service';
import type { IAdminFlag } from '../services/flag.service';

interface FlagsPanelProps {
  token: string | null;
}

export function FlagsPanel({ token }: FlagsPanelProps) {
  const [flags, setFlags] = useState<IAdminFlag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFlag, setSelectedFlag] = useState<IAdminFlag | null>(null);

  const fetchFlags = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await flagService.getAll(token);
      setFlags(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar banderas');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const getFlagBadge = (tipo: string) => {
    switch (tipo) {
      case 'verde': return <span className="status-badge" style={{ backgroundColor: '#22c55e' }}>Verde</span>;
      case 'amarilla': return <span className="status-badge" style={{ backgroundColor: '#eab308' }}>Amarilla</span>;
      case 'naranja': return <span className="status-badge" style={{ backgroundColor: '#f97316' }}>Naranja</span>;
      case 'roja': return <span className="status-badge" style={{ backgroundColor: '#ef4444' }}>Roja</span>;
      default: return <span className="status-badge" style={{ backgroundColor: '#9ca3af' }}>{tipo}</span>;
    }
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-h)' }}>Banderas y Alertas</h2>
        <button className="btn" style={{ backgroundColor: '#175fbd', color: 'black', border: '2px solid black', margin: 0 }} onClick={fetchFlags}>Actualizar</button>
      </div>

      {loading && <p className="res-status">Cargando banderas…</p>}
      {error && <p className="res-status res-error">{error}</p>}
      {!loading && !error && flags.length === 0 && <p className="res-status">No hay banderas registradas.</p>}

      {!loading && flags.length > 0 && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Usuario Afectado</th>
              <th>Motivo</th>
              <th>Asignado Por</th>
              <th style={{ textAlign: 'center' }}>Detalles</th>
            </tr>
          </thead>
          <tbody>
            {flags.map(flag => (
              <tr key={flag._id}>
                <td>{new Date(flag.createdAt).toLocaleString('es-CL')}</td>
                <td>{getFlagBadge(flag.tipo)}</td>
                <td>{flag.usuario ? `${flag.usuario.nombre} ${flag.usuario.apellido}` : 'Desconocido'}</td>
                <td>{flag.motivo.length > 40 ? `${flag.motivo.substring(0, 40)}...` : flag.motivo}</td>
                <td>
                  {flag.asignadoPor === 'admin' && flag.adminId
                    ? `Admin: ${flag.adminId.nombre} ${flag.adminId.apellido}`
                    : 'Sistema'}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button className="btn btn-sm" onClick={() => setSelectedFlag(flag)}>Ver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* MODAL DETALLES */}
      {selectedFlag && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ backgroundColor: 'var(--bg-card, #fff)', padding: '2rem', borderRadius: '12px', maxWidth: '500px', width: '90%', position: 'relative', color: 'var(--text-p)' }}>
            <button onClick={() => setSelectedFlag(null)} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold' }}>X</button>

            <h2 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', color: 'var(--text-h)' }}>Detalle de Bandera</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.05rem' }}>
              <p style={{ margin: 0 }}><strong>Tipo:</strong> {getFlagBadge(selectedFlag.tipo)}</p>
              <p style={{ margin: 0 }}><strong>Usuario:</strong> {selectedFlag.usuario ? `${selectedFlag.usuario.nombre} ${selectedFlag.usuario.apellido} (${selectedFlag.usuario.departamento})` : 'Desconocido'}</p>
              <p style={{ margin: 0 }}><strong>Motivo:</strong> {selectedFlag.motivo}</p>
              <p style={{ margin: 0 }}><strong>Asignado por:</strong> {selectedFlag.asignadoPor === 'admin' && selectedFlag.adminId ? `${selectedFlag.adminId.nombre} ${selectedFlag.adminId.apellido}` : 'Sistema'}</p>
              <p style={{ margin: 0 }}><strong>Fecha:</strong> {new Date(selectedFlag.createdAt).toLocaleString('es-CL')}</p>
              
              {selectedFlag.reserva && (
                <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', border: '1px solid #9ca3af' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>Reserva Relacionada</h4>
                  {typeof selectedFlag.reserva === 'object' && 'vehiculo' in selectedFlag.reserva ? (
                    <>
                      <p style={{ margin: 0 }}><strong>Desde:</strong> {new Date((selectedFlag.reserva as any).fechaInicio).toLocaleString('es-CL')}</p>
                      <p style={{ margin: 0 }}><strong>Hasta:</strong> {new Date((selectedFlag.reserva as any).fechaFin).toLocaleString('es-CL')}</p>
                    </>
                  ) : (
                    <p style={{ margin: 0 }}><strong>ID Reserva:</strong> {selectedFlag.reserva}</p>
                  )}
                </div>
              )}
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <button className="btn btn-close" onClick={() => setSelectedFlag(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
