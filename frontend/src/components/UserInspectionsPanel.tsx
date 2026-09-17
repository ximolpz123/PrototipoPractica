import { useState, useEffect, useCallback } from 'react';
import type { IRandomInspection } from '../types';
import { inspectionService } from '../services/inspection.service';

interface UserInspectionsPanelProps {
  token: string | null;
}

export function UserInspectionsPanel({ token }: UserInspectionsPanelProps) {
  const [inspections, setInspections] = useState<IRandomInspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Timer state to trigger re-renders for the countdown
  const [now, setNow] = useState(Date.now());

  // Modal para responder
  const [selectedInspection, setSelectedInspection] = useState<IRandomInspection | null>(null);
  const [respuestaTexto, setRespuestaTexto] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInspections = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await inspectionService.getPending(token);
      setInspections(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar inspecciones pendientes');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRespond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedInspection) return;

    if (!respuestaTexto.trim() && !foto) {
      alert('Debes proporcionar un texto o al menos una foto');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (respuestaTexto) formData.append('respuestaTexto', respuestaTexto);
      if (foto) formData.append('fotos', foto); // Multer en backend espera 'fotos'

      const response = await fetch(`http://localhost:5000/api/inspections/${selectedInspection._id}/respond`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Error al enviar respuesta');
      }

      alert('¡Inspección respondida exitosamente!');
      setSelectedInspection(null);
      setRespuestaTexto('');
      setFoto(null);
      fetchInspections();
    } catch (error: any) {
      alert(error.message || 'Hubo un error al enviar la respuesta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTimeRemaining = (fechaActivacion: string) => {
    const actTime = new Date(fechaActivacion).getTime();
    // 13 minutos = 13 * 60 * 1000 = 780000 ms
    const limitTime = actTime + 780000;
    const diff = limitTime - now;
    
    if (diff <= 0) return { expired: true, text: 'Vencida' };
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return { 
      expired: false, 
      text: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      isCritical: diff < 180000 // menos de 3 minutos
    };
  };

  return (
    <div style={{ width: '100%' }}>
      <h1 style={{ margin: 0, marginBottom: '24px', fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-h)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'left' }}>
        Mis Inspecciones
      </h1>

      {loading && <p className="res-status">Cargando inspecciones…</p>}
      {error && <p className="res-status res-error">{error}</p>}
      
      {!loading && !error && inspections.length === 0 && (
        <div className="dash-stat-card" style={{ padding: '2rem', textAlign: 'center', border: '1px solid var(--border)', backgroundColor: 'var(--bg-panel)' }}>
          <p style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-p)' }}>No tienes inspecciones pendientes en este momento.</p>
          <p style={{ margin: '8px 0 0', fontSize: '0.9rem', opacity: 0.7 }}>Sigue conduciendo de forma segura.</p>
        </div>
      )}

      {!loading && inspections.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {inspections.map(insp => {
            const timeInfo = getTimeRemaining(insp.fechaActivacion);
            
            return (
              <div key={insp._id} className="dash-stat-card" style={{ 
                padding: '1.5rem', 
                border: `1px solid ${timeInfo.expired ? '#ef4444' : (timeInfo.isCritical ? '#f59e0b' : 'var(--border)')}`,
                backgroundColor: 'var(--bg-panel)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-h)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⚠️ Inspección Requerida
                  </h3>
                  <p style={{ margin: '0 0 4px 0', color: 'var(--text-p)' }}><strong>Tarea:</strong> {insp.tarea}</p>
                  <p style={{ margin: '0 0 4px 0', color: 'var(--text-p)' }}><strong>Vehículo:</strong> {insp.vehiculoPlaca}</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-p)', opacity: 0.8 }}>
                    Activada: {new Date(insp.fechaActivacion).toLocaleTimeString('es-CL')}
                  </p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', minWidth: '150px' }}>
                  <div style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold', 
                    color: timeInfo.expired ? '#ef4444' : (timeInfo.isCritical ? '#f59e0b' : '#22c55e'),
                    fontFamily: 'monospace'
                  }}>
                    {timeInfo.text}
                  </div>
                  
                  <button 
                    className="btn" 
                    style={{ 
                      backgroundColor: timeInfo.expired ? '#9ca3af' : '#175fbd', 
                      color: 'white',
                      width: '100%',
                      cursor: timeInfo.expired ? 'not-allowed' : 'pointer'
                    }} 
                    onClick={() => !timeInfo.expired && setSelectedInspection(insp)}
                    disabled={timeInfo.expired}
                  >
                    Responder
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PARA RESPONDER */}
      {selectedInspection && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ backgroundColor: 'var(--bg-panel)', padding: '2rem', borderRadius: '12px', maxWidth: '500px', width: '90%', position: 'relative', color: 'var(--text-p)', border: '1px solid var(--border)' }}>
            <button onClick={() => { setSelectedInspection(null); setRespuestaTexto(''); setFoto(null); }} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: 'var(--bg-input)', color: 'var(--text-h)', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-h)', textAlign: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              Responder Inspección
            </h2>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-input)', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 8px 0' }}><strong>Instrucción:</strong></p>
              <p style={{ margin: 0, fontSize: '1.1rem' }}>{selectedInspection.tarea}</p>
            </div>

            <form onSubmit={handleRespond} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>Comentario / Observación</label>
                <textarea
                  className="reserv-input"
                  style={{ width: '100%', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical' }}
                  placeholder="Describe lo que se solicitó (ej: El interior está limpio)..."
                  value={respuestaTexto}
                  onChange={e => setRespuestaTexto(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>Fotografía de Evidencia</label>
                <input
                  type="file"
                  accept="image/*"
                  className="reserv-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  onChange={e => setFoto(e.target.files ? e.target.files[0] : null)}
                />
                <small style={{ display: 'block', marginTop: '4px', opacity: 0.8 }}>Sube una foto clara que cumpla con la tarea solicitada.</small>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
                <button type="submit" className="btn" style={{ backgroundColor: '#175fbd', color: 'white', flex: 1 }} disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando...' : 'Enviar Respuesta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
