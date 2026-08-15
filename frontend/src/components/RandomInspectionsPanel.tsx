import { useState, useEffect } from 'react';
import type { IRandomInspection, IUser, IVehicle } from '../types';

interface RandomInspectionsPanelProps {
  token: string | null;
  users?: IUser[];
  vehicles?: IVehicle[];
}

const getLocalDatetimeString = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

export function RandomInspectionsPanel({ users = [], vehicles = [] }: RandomInspectionsPanelProps) {
  const [inspections, setInspections] = useState<IRandomInspection[]>([]);
  const [loading] = useState(false);
  const [error] = useState('');
  const [selectedInspection, setSelectedInspection] = useState<IRandomInspection | null>(null);

  // Modal de Creación
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInspection, setNewInspection] = useState({
    conductorId: '',
    vehiculoId: '',
    tarea: '',
    fechaActivacion: getLocalDatetimeString()
  });

  // Cargar datos iniciales
  useEffect(() => {
    const mockInspections: IRandomInspection[] = [
      {
        _id: 'insp_1',
        conductorId: 'cond_1',
        conductorNombre: 'Juan Pérez',
        vehiculoId: 'veh_1',
        vehiculoPlaca: 'SKJS-32',
        tarea: 'Revisar neumáticos',
        estado: 'pendiente',
        fechaActivacion: new Date().toISOString()
      },
      {
        _id: 'insp_2',
        conductorId: 'cond_2',
        conductorNombre: 'Maria Gómez',
        vehiculoId: 'veh_2',
        vehiculoPlaca: 'NSNV-24',
        tarea: 'Foto interior',
        estado: 'respondida',
        fechaActivacion: new Date(Date.now() - 3600000).toISOString(),
        respuesta: {
          texto: 'Todo limpio y en orden.',
          fechaRespuesta: new Date(Date.now() - 3000000).toISOString()
        }
      },
      {
        _id: 'insp_3',
        conductorId: 'cond_3',
        conductorNombre: 'Pedro Soto',
        vehiculoId: 'veh_3',
        vehiculoPlaca: 'HLXZ-25',
        tarea: 'Nivel bencina',
        estado: 'vencida',
        fechaActivacion: new Date(Date.now() - 86400000).toISOString()
      }
    ];
    setInspections(mockInspections);
  }, []);

  /* 
  // Timer para caducar inspecciones pendientes tras 2 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      setInspections(prev => {
        let changed = false;
        const now = Date.now();
        const updated = prev.map(insp => {
          if (insp.estado === 'pendiente') {
            const actTime = new Date(insp.fechaActivacion).getTime();
            // 2 minutos = 120000 ms
            if (now - actTime > 120000) {
              changed = true;
              return { ...insp, estado: 'vencida' };
            }
          }
          return insp;
        });
        return changed ? updated : prev;
      });
    }, 5000); // Revisar cada 5 segundos

    return () => clearInterval(interval);
  }, []);
  */

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const conductor = users.find(u => u.id === newInspection.conductorId);
    const vehiculo = vehicles.find(v => v._id === newInspection.vehiculoId);

    const created: IRandomInspection = {
      _id: 'insp_' + Date.now(),
      conductorId: newInspection.conductorId,
      conductorNombre: conductor ? `${conductor.nombre} ${conductor.apellido}` : 'Desconocido',
      vehiculoId: newInspection.vehiculoId,
      vehiculoPlaca: vehiculo ? vehiculo.placa : 'Desconocida',
      tarea: newInspection.tarea,
      estado: 'pendiente',
      fechaActivacion: new Date(newInspection.fechaActivacion).toISOString()
    };

    setInspections(prev => [created, ...prev]);
    setShowCreateModal(false);
    // Reiniciar formulario
    setNewInspection({
      conductorId: '',
      vehiculoId: '',
      tarea: '',
      fechaActivacion: getLocalDatetimeString()
    });
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente': return <span className="status-badge" style={{ backgroundColor: '#eab308' }}>Pendiente</span>;
      case 'respondida': return <span className="status-badge" style={{ backgroundColor: '#22c55e' }}>Respondida</span>;
      case 'vencida': return <span className="status-badge" style={{ backgroundColor: '#ef4444' }}>Vencida</span>;
      default: return null;
    }
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-h)' }}>Inspecciones Aleatorias</h2>
        <button className="btn btn-create" onClick={() => setShowCreateModal(true)}>Crear Inspección</button>
      </div>

      {loading && <p className="res-status">Cargando inspecciones…</p>}
      {error && <p className="res-status res-error">{error}</p>}
      {!loading && !error && inspections.length === 0 && <p className="res-status">No hay inspecciones registradas.</p>}

      {!loading && inspections.length > 0 && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Fecha Activación</th>
              <th>Conductor</th>
              <th>Vehículo (Patente)</th>
              <th>Tarea</th>
              <th>Estado</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map(insp => (
              <tr key={insp._id}>
                <td>{new Date(insp.fechaActivacion).toLocaleString('es-CL')}</td>
                <td>{insp.conductorNombre}</td>
                <td>{insp.vehiculoPlaca}</td>
                <td>{insp.tarea}</td>
                <td>{getStatusBadge(insp.estado)}</td>
                <td style={{ textAlign: 'center' }}>
                  <button className="btn btn-sm" onClick={() => setSelectedInspection(insp)}>Detalles</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* MODAL CREAR INSPECCIÓN */}
      {showCreateModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ backgroundColor: 'var(--bg-card, #fff)', padding: '2rem', borderRadius: '12px', maxWidth: '500px', width: '90%', position: 'relative', color: 'var(--text-p)' }}>
            <button onClick={() => setShowCreateModal(false)} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-h)', textAlign: 'center' }}>Nueva Inspección</h2>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>Fecha y Hora de Activación</label>
                <input
                  type="datetime-local"
                  className="reserv-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={newInspection.fechaActivacion}
                  onChange={e => setNewInspection({ ...newInspection, fechaActivacion: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>Conductor</label>
                <select
                  className="reserv-select"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={newInspection.conductorId}
                  onChange={e => setNewInspection({ ...newInspection, conductorId: e.target.value })}
                  required
                >
                  <option value="">Seleccione conductor...</option>
                  {users.filter(u => u.activo).map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>Vehículo</label>
                <select
                  className="reserv-select"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={newInspection.vehiculoId}
                  onChange={e => setNewInspection({ ...newInspection, vehiculoId: e.target.value })}
                  required
                >
                  <option value="">Seleccione vehículo...</option>
                  {vehicles.map(v => (
                    <option key={v._id} value={v._id}>{v.marca} {v.modelo} - {v.placa}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>Tarea / Instrucción</label>
                <input
                  type="text"
                  placeholder="Ej. Tomar foto del interior"
                  className="reserv-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={newInspection.tarea}
                  onChange={e => setNewInspection({ ...newInspection, tarea: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
                <button type="submit" className="btn" style={{ backgroundColor: '#175fbd', color: 'black' }}>Crear</button>
                <button type="button" className="btn" style={{ background: 'rgba(239, 68, 68, 0.75)', color: 'black' }} onClick={() => setShowCreateModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLES */}
      {selectedInspection && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ backgroundColor: 'var(--bg-card, #fff)', padding: '2rem', borderRadius: '12px', maxWidth: '500px', width: '90%', position: 'relative', color: 'var(--text-p)' }}>
            <button onClick={() => setSelectedInspection(null)} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold' }}>X</button>

            <h2 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', color: 'var(--text-h)' }}>Detalle de Inspección</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.05rem' }}>
              <p style={{ margin: 0 }}><strong>Conductor:</strong> {selectedInspection.conductorNombre}</p>
              <p style={{ margin: 0 }}><strong>Vehículo:</strong> {selectedInspection.vehiculoPlaca}</p>
              <p style={{ margin: 0 }}><strong>Tarea:</strong> {selectedInspection.tarea}</p>
              <p style={{ margin: 0 }}><strong>Estado:</strong> {getStatusBadge(selectedInspection.estado)}</p>
              <p style={{ margin: 0 }}><strong>Activación:</strong> {new Date(selectedInspection.fechaActivacion).toLocaleString('es-CL')}</p>

              {selectedInspection.estado === 'respondida' && selectedInspection.respuesta && (
                <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', border: '1px solid #9ca3af' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>Respuesta del Conductor</h4>
                  <p style={{ margin: 0, fontStyle: 'italic' }}>"{selectedInspection.respuesta.texto}"</p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', opacity: 0.8 }}>
                    Respondido el: {new Date(selectedInspection.respuesta.fechaRespuesta).toLocaleString('es-CL')}
                  </p>
                  {selectedInspection.respuesta.fotoUrl && (
                    <img src={selectedInspection.respuesta.fotoUrl} alt="Foto inspección" style={{ width: '100%', borderRadius: '8px', marginTop: '0.5rem' }} />
                  )}
                </div>
              )}

              {selectedInspection.estado === 'pendiente' && (
                <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', border: '1px solid #eab308' }}>
                  <p style={{ margin: 0, fontWeight: 'bold', color: '#b45309' }}>Esperando respuesta del conductor...</p>
                  <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>Se vencerá si no responde en 2 minutos desde la activación.</p>
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <button className="btn btn-close" onClick={() => setSelectedInspection(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
