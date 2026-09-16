import { useState, useEffect, useCallback } from 'react';
import type { IRandomInspection, IUser, IVehicle } from '../types';
import { inspectionService } from '../services/inspection.service';

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

export function RandomInspectionsPanel({ token, users = [], vehicles = [] }: RandomInspectionsPanelProps) {
  const [inspections, setInspections] = useState<IRandomInspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedInspection, setSelectedInspection] = useState<IRandomInspection | null>(null);

  // Modal de Creación
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInspection, setNewInspection] = useState({
    conductorId: '',
    vehiculoId: '',
    tarea: '',
    fechaActivacion: getLocalDatetimeString()
  });

  const fetchInspections = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await inspectionService.getAll(token);

      // Adaptar la respuesta del backend al formato que espera la tabla (IRandomInspection)
      const mappedData: IRandomInspection[] = data.map((item: any) => {
        // Encontrar conductor
        const cId = item.usuario?._id || item.conductorId || item.usuario;
        const foundUser = users.find(u => u.id === cId || (u as any)._id === cId);
        let cName = 'Desconocido';
        if (foundUser) {
          cName = `${foundUser.nombre} ${foundUser.apellido}`;
        } else if (item.usuario && item.usuario.nombre) {
          cName = `${item.usuario.nombre} ${item.usuario.apellido}`;
        } else if (item.conductorNombre) {
          cName = item.conductorNombre;
        }

        // Encontrar vehículo
        const vId = item.reserva?.vehiculo?._id || item.reserva?.vehiculo || item.vehiculoId || item.vehiculo;
        let vPlaca = 'Desconocida';
        const foundVehicle = vehicles.find(v => v._id === vId);
        if (foundVehicle) {
          vPlaca = foundVehicle.placa;
        } else if (item.reserva?.vehiculo?.placa) {
          vPlaca = item.reserva.vehiculo.placa;
        } else if (item.vehiculoPlaca) {
          vPlaca = item.vehiculoPlaca;
        } else if (vId) {
          vPlaca = typeof vId === 'string' ? vId : 'Desconocida';
        }

        return {
          _id: item._id,
          conductorId: cId,
          conductorNombre: cName,
          vehiculoId: vId,
          vehiculoPlaca: vPlaca,
          tarea: item.tipo || item.tarea || 'N/A',
          estado: item.estado,
          fechaActivacion: item.fechaActivacion,
          respuesta: item.respuestaTexto || item.respuestaFotosUrls?.length ? {
            texto: item.respuestaTexto,
            fotoUrl: item.respuestaFotosUrls?.[0],
            fechaRespuesta: item.updatedAt
          } : undefined
        };
      });

      setInspections(mappedData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar inspecciones');
    } finally {
      setLoading(false);
    }
  }, [token, users, vehicles]);

  // Cargar datos iniciales
  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  // Timer para manejar estados 'pendiente' y 'en_curso'
  useEffect(() => {
    const interval = setInterval(() => {
      setInspections(prev => {
        let changed = false;
        const now = Date.now();
        const updated = prev.map(insp => {
          if (insp.estado === 'pendiente') {
            const actTime = new Date(insp.fechaActivacion).getTime();
            // 3 minutos = 180000 ms
            if (now - actTime > 180000) {
              changed = true;
              return { ...insp, estado: 'en_curso' };
            }
          } else if (insp.estado === 'en_curso') {
            const actTime = new Date(insp.fechaActivacion).getTime();
            // 3 minutos (espera) + 10 minutos (tarea) = 13 minutos = 780000 ms
            if (now - actTime > 780000) {
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const conductor = users.find(u => u.id === newInspection.conductorId || (u as any)._id === newInspection.conductorId);
    const vehiculo = vehicles.find(v => v._id === newInspection.vehiculoId);

    if (!token) return;

    try {
      const response = await fetch('http://localhost:5000/api/inspections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          conductorId: newInspection.conductorId,
          vehiculoId: newInspection.vehiculoId,
          tarea: newInspection.tarea,
          fechaActivacion: newInspection.fechaActivacion
        })
      });

      if (!response.ok) {
        throw new Error('Error al crear inspección manual');
      }

      const createdItem = await response.json();

      const created: IRandomInspection = {
        _id: createdItem._id || 'insp_' + Date.now(),
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
      setNewInspection({
        conductorId: '',
        vehiculoId: '',
        tarea: '',
        fechaActivacion: getLocalDatetimeString()
      });
    } catch (err) {
      alert('Hubo un error al crear la inspección en el servidor.');
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente': return <span className="status-badge" style={{ backgroundColor: '#eab308' }}>Pendiente</span>;
      case 'en_curso': return <span className="status-badge" style={{ backgroundColor: '#3b82f6' }}>En Curso</span>;
      case 'respondida': return <span className="status-badge" style={{ backgroundColor: '#22c55e' }}>Respondida</span>;
      case 'vencida': return <span className="status-badge" style={{ backgroundColor: '#ef4444' }}>Vencida</span>;
      default: return null;
    }
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-h)', textTransform: 'uppercase', letterSpacing: '1px' }}>Inspecciones Aleatorias</h1>
        {/* <button className="btn" style={{ backgroundColor: '#175fbd', color: 'white' }} onClick={() => setShowCreateModal(true)}>Crear Inspección</button> */}
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
          <div className="modal-content" style={{ backgroundColor: 'var(--bg-panel)', padding: '2rem', borderRadius: '12px', maxWidth: '500px', width: '90%', position: 'relative', color: 'var(--text-p)', border: '1px solid var(--border)' }}>
            <button onClick={() => setShowCreateModal(false)} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: 'var(--bg-input)', color: 'var(--text-h)', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-h)', textAlign: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Nueva Inspección</h2>

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
          <div className="modal-content" style={{ backgroundColor: 'var(--bg-panel)', padding: '2rem', borderRadius: '12px', maxWidth: '500px', width: '90%', position: 'relative', color: 'var(--text-p)', border: '1px solid var(--border)' }}>
            <button onClick={() => setSelectedInspection(null)} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: 'var(--bg-input)', color: 'var(--text-h)', cursor: 'pointer', fontWeight: 'bold' }}>X</button>

            <h2 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text-h)' }}>Detalle de Inspección</h2>
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
                  <p style={{ margin: 0, fontWeight: 'bold', color: '#b45309' }}>Inspección programada...</p>
                  <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>Pasará a "En Curso" en 3 minutos desde su activación.</p>
                </div>
              )}

              {selectedInspection.estado === 'en_curso' && (
                <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', border: '1px solid #3b82f6' }}>
                  <p style={{ margin: 0, fontWeight: 'bold', color: '#1d4ed8' }}>Esperando respuesta del conductor...</p>
                  <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>Se vencerá si no responde en 10 minutos.</p>
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
