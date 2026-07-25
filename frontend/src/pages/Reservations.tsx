import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserProfileMenu from '../components/UserProfileMenu';

import autoCafeImg from '../assets/auto-cafe.png';
import camionetaRojaImg from '../assets/camioneta-roja.png';
import camionetaAzulImg from '../assets/camioneta-azul.png';
import camionetaBlancaImg from '../assets/camioneta-blanca.png';

// ─── Datos de los 4 vehículos ────────────────────────────────────────────────
const VEHICLES = [
  { id: '1', nombre: 'Auto Café',        imagen: autoCafeImg,       estado: 'disponible' },
  { id: '2', nombre: 'Camioneta Roja',   imagen: camionetaRojaImg,  estado: 'reservado' },
  { id: '3', nombre: 'Camioneta Azul',   imagen: camionetaAzulImg,  estado: 'mantenimiento' },
  { id: '4', nombre: 'Camioneta Blanca', imagen: camionetaBlancaImg, estado: 'fuera_de_servicio' },
];

function Reservations() {
  const navigate = useNavigate();

  const [vehiculoId, setVehiculoId]       = useState('');
  const [fechaInicio, setFechaInicio]     = useState('');
  const [fechaFin, setFechaFin]           = useState('');
  const [destino, setDestino]             = useState('');
  const [motivo, setMotivo]               = useState('');
  const [vehiculoError, setVehiculoError] = useState(false);
  const [loading, setLoading]             = useState(false);
  const [success, setSuccess]             = useState(false);
  const [apiError, setApiError]           = useState('');

  const selectedVehicle = VEHICLES.find((v) => v.id === vehiculoId);

  const handleVehiculoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setVehiculoId(id);
    const v = VEHICLES.find((v) => v.id === id);
    setVehiculoError(!!v && v.estado !== 'disponible');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehiculoId || vehiculoError || !fechaInicio || !fechaFin || !destino) return;

    setLoading(true);
    setApiError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vehiculo: vehiculoId,
          fechaInicio,
          fechaFin,
          destino,
          motivo: motivo.trim() === '' ? '- - -' : motivo,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al crear la reservación');
      }

      setSuccess(true);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Error al crear la reservación');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/vehicles', { state: { tab: 'reservaciones' } });
  };

  return (
    <div className="page" style={{ position: 'relative', width: '100%', boxSizing: 'border-box', padding: '2rem' }}>
      <UserProfileMenu />

      <h1 style={{ textAlign: 'center', marginTop: '3rem', marginBottom: '1.5rem', fontSize: '2rem', color: '#000' }}>
        Cree su Reservación
      </h1>

      {success ? (
        <div className="reserv-form-panel" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#22c55e', marginBottom: '1.5rem' }}>
            ✅ ¡Solicitud enviada correctamente!
          </p>
          <p style={{ color: '#555', marginBottom: '2rem' }}>
            Su solicitud ha sido enviada al administrador para su revisión.
          </p>
          <button className="btn" onClick={handleCancel} style={{ color: 'black' }}>
            Ver mis Reservaciones
          </button>
        </div>
      ) : (
        <form className="reserv-form-panel" onSubmit={handleSubmit}>

          {/* ── Vehículo ── */}
          <div className="reserv-form-row">
            <label className="reserv-label" htmlFor="vehiculo-select">
              Elija el tipo de Vehículo
            </label>
            <div style={{ flex: 1 }}>
              <select
                id="vehiculo-select"
                className={`reserv-select${vehiculoError ? ' reserv-select-error' : ''}`}
                value={vehiculoId}
                onChange={handleVehiculoChange}
                required
              >
                <option value="">— Seleccione un vehículo —</option>
                {VEHICLES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre} {v.estado !== 'disponible' ? `(${v.estado.replace('_', ' ')})` : ''}
                  </option>
                ))}
              </select>
              {vehiculoError && (
                <p className="reserv-field-error">
                  ⚠️ Este vehículo no está disponible. Por favor seleccione otro.
                </p>
              )}
              {selectedVehicle && !vehiculoError && (
                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img
                    src={selectedVehicle.imagen}
                    alt={selectedVehicle.nombre}
                    style={{ width: '80px', height: '55px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd' }}
                  />
                  <span style={{ color: '#22c55e', fontWeight: '600' }}>✔ Disponible</span>
                </div>
              )}
            </div>
          </div>

          <hr className="reserv-divider" />

          {/* ── Fechas ── */}
          <div className="reserv-form-row">
            <label className="reserv-label">Seleccione una Fecha</label>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <label style={{ fontWeight: '600', minWidth: '80px', color: '#333' }}>Inicio:</label>
                <input
                  id="fecha-inicio"
                  type="datetime-local"
                  className="reserv-input"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <label style={{ fontWeight: '600', minWidth: '80px', color: '#333' }}>Fin:</label>
                <input
                  id="fecha-fin"
                  type="datetime-local"
                  className="reserv-input"
                  value={fechaFin}
                  min={fechaInicio}
                  onChange={(e) => setFechaFin(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <hr className="reserv-divider" />

          {/* ── Destino ── */}
          <div className="reserv-form-row">
            <label className="reserv-label" htmlFor="destino-input">
              Escriba su Destino
            </label>
            <input
              id="destino-input"
              type="text"
              className="reserv-input"
              placeholder="Ej: Planta Norte, Santiago..."
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              required
              style={{ flex: 1 }}
            />
          </div>

          <hr className="reserv-divider" />

          {/* ── Motivo ── */}
          <div className="reserv-form-row" style={{ alignItems: 'flex-start' }}>
            <label className="reserv-label" style={{ paddingTop: '0.5rem' }}>
              Escriba el Motivo<br />
              <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: 'normal' }}>(Es Opcional)</span>
            </label>
            <textarea
              id="motivo-textarea"
              className="reserv-textarea"
              placeholder="Describa brevemente el motivo del viaje..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={4}
            />
          </div>

          {apiError && (
            <p className="reserv-field-error" style={{ textAlign: 'center' }}>
              ⚠️ {apiError}
            </p>
          )}

          {/* ── Botones ── */}
          <div className="reserv-form-actions">
            <button
              id="btn-crear-reservacion"
              type="submit"
              className="btn"
              disabled={loading || vehiculoError || !vehiculoId || !fechaInicio || !fechaFin || !destino}
              style={{ backgroundColor: '#175fbd', color: 'black', opacity: (loading || vehiculoError || !vehiculoId || !fechaInicio || !fechaFin || !destino) ? 0.5 : 1 }}
            >
              {loading ? 'Enviando…' : '✅ Crear la Reservación'}
            </button>
            <button
              id="btn-cancelar-reservacion"
              type="button"
              className="btn"
              onClick={handleCancel}
              style={{ backgroundColor: '#e5e7eb', color: 'black' }}
            >
              ✖ Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default Reservations;
