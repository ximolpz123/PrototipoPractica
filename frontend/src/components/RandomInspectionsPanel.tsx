import { useState, useEffect } from 'react';
import type { IRandomInspection } from '../types';

interface RandomInspectionsPanelProps {
  token: string | null;
}

export function RandomInspectionsPanel(_props: RandomInspectionsPanelProps) {
  const [inspections, setInspections] = useState<IRandomInspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedInspection, setSelectedInspection] = useState<IRandomInspection | null>(null);

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    setLoading(true); setError('');
    try {
      // Mocked data since backend endpoint is pending
      const mockInspections: IRandomInspection[] = [
        {
          _id: 'insp_1',
          conductorId: 'cond_1',
          conductorNombre: 'Juan Pérez',
          vehiculoId: 'veh_1',
          vehiculoPlaca: 'SK-JS-32',
          tarea: 'Revisar neumáticos',
          estado: 'pendiente',
          fechaActivacion: new Date().toISOString()
        },
        {
          _id: 'insp_2',
          conductorId: 'cond_2',
          conductorNombre: 'Maria Gómez',
          vehiculoId: 'veh_2',
          vehiculoPlaca: 'NS-NV-24',
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
          vehiculoPlaca: 'HL-XZ-25',
          tarea: 'Nivel bencina',
          estado: 'vencida',
          fechaActivacion: new Date(Date.now() - 86400000).toISOString()
        }
      ];
      setInspections(mockInspections);
    } catch {
      setError('Error al cargar inspecciones.');
    } finally {
      setLoading(false);
    }
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
        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700', color: '#000' }}> Inspecciones Aleatorias</h2>
        <button className="btn btn-create" onClick={fetchInspections}>🔄 Refrescar</button>
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
                  <button className="btn btn-sm" onClick={() => setSelectedInspection(insp)}>Ver Detalles</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* MODAL DETALLES */}
      {selectedInspection && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ backgroundColor: 'var(--bg-card, #fff)', padding: '2rem', borderRadius: '12px', maxWidth: '500px', width: '90%', position: 'relative' }}>
            <button onClick={() => setSelectedInspection(null)} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#e5e7eb', color: '#000', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
            
            <h2 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Detalle de Inspección</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.05rem' }}>
              <p style={{ margin: 0 }}><strong>Conductor:</strong> {selectedInspection.conductorNombre}</p>
              <p style={{ margin: 0 }}><strong>Vehículo:</strong> {selectedInspection.vehiculoPlaca}</p>
              <p style={{ margin: 0 }}><strong>Tarea:</strong> {selectedInspection.tarea}</p>
              <p style={{ margin: 0 }}><strong>Estado:</strong> {selectedInspection.estado}</p>
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
                  <p style={{ margin: 0, fontWeight: 'bold' }}>Esperando respuesta del conductor...</p>
                  <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>El conductor tiene 20 minutos para responder.</p>
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
