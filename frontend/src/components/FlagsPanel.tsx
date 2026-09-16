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
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterFlagType, setFilterFlagType] = useState('');
  const [filterUser, setFilterUser] = useState('');

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

  const filteredFlags = flags.filter(flag => {
    if (filterStartDate) {
      const start = new Date(filterStartDate);
      start.setHours(0, 0, 0, 0);
      if (new Date(flag.createdAt) < start) return false;
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      if (new Date(flag.createdAt) > end) return false;
    }
    if (filterFlagType && flag.tipo !== filterFlagType) {
      return false;
    }
    if (filterUser) {
      if (!flag.usuario || flag.usuario._id !== filterUser) {
        return false;
      }
    }
    return true;
  });

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-h)', textTransform: 'uppercase', letterSpacing: '1px' }}>Banderas y Alertas</h1>
          <button 
            className="btn" 
            style={{ padding: '0 8px', borderRadius: '50%', minWidth: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, fontWeight: 'bold' }}
            onClick={() => setShowHelpModal(true)}
          >
            ?
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', flex: '0 1 auto', justifyContent: 'center' }}>
          <div className="flag-kpi flag-kpi-verde">
            <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
            <strong>Verde:</strong> {flags.filter(f => f.tipo === 'verde').length}
          </div>
          <div className="flag-kpi flag-kpi-amarilla">
            <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#eab308' }} />
            <strong>Amarilla:</strong> {flags.filter(f => f.tipo === 'amarilla').length}
          </div>
          <div className="flag-kpi flag-kpi-naranja">
            <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#f97316' }} />
            <strong>Naranja:</strong> {flags.filter(f => f.tipo === 'naranja').length}
          </div>
          <div className="flag-kpi flag-kpi-roja">
            <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
            <strong>Roja:</strong> {flags.filter(f => f.tipo === 'roja').length}
          </div>
        </div>
        <div style={{ flex: 1 }}></div>
      </div>

      <div className="filter-panel" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px', alignItems: 'flex-end', boxSizing: 'border-box', width: '100%' }}>
        <div style={{ flex: '1' }}>
          <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.4rem', textAlign: 'center', color: 'var(--text-p)' }}>Fecha de Inicio</label>
          <input type="date" className="reserv-input" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', height: '44px' }} />
        </div>
        <div style={{ flex: '1' }}>
          <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.4rem', textAlign: 'center', color: 'var(--text-p)' }}>Fecha de Fin</label>
          <input type="date" className="reserv-input" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', height: '44px' }} />
        </div>
        <div style={{ flex: '1' }}>
          <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.4rem', textAlign: 'center', color: 'var(--text-p)' }}>Tipo de Bandera</label>
          <select className="reserv-select" value={filterFlagType} onChange={e => setFilterFlagType(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', height: '44px' }}>
            <option value="">Todas</option>
            <option value="verde">Verde</option>
            <option value="amarilla">Amarilla</option>
            <option value="naranja">Naranja</option>
            <option value="roja">Roja</option>
          </select>
        </div>
        <div style={{ flex: '1' }}>
          <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.4rem', textAlign: 'center', color: 'var(--text-p)' }}>Usuario</label>
          <select className="reserv-select" value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', height: '44px' }}>
            <option value="">Todos</option>
            {Array.from(new Map(flags.filter(f => f.usuario).map(f => [f.usuario!._id, f.usuario!])).values()).map(u => (
              <option key={u._id} value={u._id}>{u.nombre} {u.apellido}</option>
            ))}
          </select>
        </div>
        <button
          className="btn"
          style={{ background: '#3D9FD3', color: 'black', padding: 0, width: '58px', height: '44px', border: '2px solid black', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', borderRadius: '8px', cursor: 'pointer' }}
          onClick={fetchFlags}
          title="Recargar banderas"
        >
          ↻
        </button>
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
              <th>Usuario</th>
              <th>Motivo</th>
              <th>Asignado Por</th>
              <th style={{ textAlign: 'center' }}>Detalles</th>
            </tr>
          </thead>
          <tbody>
            {filteredFlags.map(flag => (
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
          <div className="modal-content" style={{ backgroundColor: 'var(--bg-panel)', padding: '2rem', borderRadius: '12px', maxWidth: '500px', width: '90%', position: 'relative', color: 'var(--text-p)', border: '1px solid var(--border)' }}>
            <button onClick={() => setSelectedFlag(null)} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: 'var(--bg-input)', color: 'var(--text-h)', cursor: 'pointer', fontWeight: 'bold' }}>X</button>

            <h2 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text-h)' }}>Detalle de Bandera</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.05rem' }}>
              <p style={{ margin: 0 }}><strong>Tipo:</strong> {getFlagBadge(selectedFlag.tipo)}</p>
              <p style={{ margin: 0 }}><strong>Usuario:</strong> {selectedFlag.usuario ? `${selectedFlag.usuario.nombre} ${selectedFlag.usuario.apellido} (${selectedFlag.usuario.departamento})` : 'Desconocido'}</p>
              <p style={{ margin: 0 }}><strong>Motivo:</strong> {selectedFlag.motivo}</p>
              <p style={{ margin: 0 }}><strong>Asignado por:</strong> {selectedFlag.asignadoPor === 'admin' && selectedFlag.adminId ? `${selectedFlag.adminId.nombre} ${selectedFlag.adminId.apellido}` : 'Sistema'}</p>
              <p style={{ margin: 0 }}><strong>Fecha:</strong> {new Date(selectedFlag.createdAt).toLocaleString('es-CL')}</p>

              {selectedFlag.evidenciaUrl && (
                <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', border: '1px solid #9ca3af' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>Evidencia</h4>
                  <img src={`http://localhost:5000${selectedFlag.evidenciaUrl}`} alt="Evidencia" style={{ width: '100%', borderRadius: '8px', maxHeight: '300px', objectFit: 'cover' }} />
                </div>
              )}

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
          </div>
        </div>
      )}

      {/* MODAL AYUDA SISTEMA DE PUNTOS */}
      {showHelpModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ backgroundColor: 'var(--bg-panel)', padding: '2rem', borderRadius: '12px', maxWidth: '600px', width: '90%', position: 'relative', color: 'var(--text-p)', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)' }}>
            <button onClick={() => setShowHelpModal(false)} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: 'var(--bg-input)', color: 'var(--text-h)', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
            <h2 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text-h)' }}>Sistema de Puntos y Banderas</h2>
            
            <p>Todos los usuarios comienzan con <strong>100 puntos</strong>. El sistema clasifica el comportamiento mediante banderas:</p>
            <ul style={{ lineHeight: '1.6' }}>
              <li><span style={{ color: '#22c55e', fontWeight: 'bold' }}>Verde (76-100 pts):</span> Sin faltas o comportamiento adecuado. Suma <strong>+5 puntos</strong> (ej. completar inspección a tiempo).</li>
              <li><span style={{ color: '#eab308', fontWeight: 'bold' }}>Amarilla (51-75 pts):</span> Faltas leves o advertencias preventivas. Resta <strong>-10 puntos</strong>.</li>
              <li><span style={{ color: '#f97316', fontWeight: 'bold' }}>Naranja (21-50 pts):</span> Faltas graves (ej. retrasos grandes, incidentes menores). Resta <strong>-20 puntos</strong>. Acumular 3 naranjas resulta en una roja.</li>
              <li><span style={{ color: '#ef4444', fontWeight: 'bold' }}>Roja (0-20 pts):</span> Faltas críticas o accidentes. Resta <strong>-30 puntos</strong>.</li>
            </ul>

            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginTop: '1.5rem', color: 'var(--text-h)' }}>Consecuencias (Penalidades)</h3>
            <ul style={{ lineHeight: '1.6' }}>
              <li><strong>Menos de 35 puntos:</strong> Se asignan 2 inspecciones aleatorias como penalidad.</li>
              <li><strong>20 puntos o menos:</strong> Se asignan 3 inspecciones aleatorias como penalidad.</li>
              <li><strong>Menos de 10 puntos:</strong> La cuenta es <strong>bloqueada</strong> automáticamente y el usuario no podrá crear nuevas reservaciones hasta ser habilitado por un administrador.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
