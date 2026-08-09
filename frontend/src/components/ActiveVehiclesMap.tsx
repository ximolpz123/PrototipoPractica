import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons for Leaflet with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface ActiveVehicle {
  _id: string;
  placa: string;
  marca: string;
  modelo: string;
  ubicacionActual?: {
    latitud: number;
    longitud: number;
    timestamp: string;
  };
  conductor?: string;
  departamento?: string;
}

interface ActiveVehiclesMapProps {
  token: string | null;
  isAdmin: boolean;
}

const USER_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width: 36px; height: 36px; border-radius: 50%;
    background: radial-gradient(circle, #3b82f6 30%, rgba(59,130,246,0.3) 70%);
    border: 3px solid white;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.5), 0 2px 8px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
  ">📍</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const VEHICLE_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width: 40px; height: 40px; border-radius: 50%;
    background: radial-gradient(circle, #f59e0b 30%, rgba(245,158,11,0.3) 70%);
    border: 3px solid white;
    box-shadow: 0 0 0 3px rgba(245,158,11,0.5), 0 2px 8px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
  ">🚗</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

export function ActiveVehiclesMap({ token, isAdmin }: ActiveVehiclesMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const vehicleMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [activeVehicles, setActiveVehicles] = useState<ActiveVehicle[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  // Fetch active vehicles
  const fetchActiveVehicles = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingVehicles(true);
    try {
      const res = await fetch('http://10.99.41.176:5000/api/tracking/active', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveVehicles(Array.isArray(data) ? data : []);
        setLastUpdated(new Date());
      }
    } catch {
      console.error('Error al obtener vehículos activos');
    } finally {
      setLoadingVehicles(false);
    }
  }, [isAdmin, token]);

  // Initialize map (only once)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-41.4693, -72.9424],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          map.setView([latitude, longitude], 14);

          const marker = L.marker([latitude, longitude], { icon: USER_ICON })
            .addTo(map)
            .bindPopup('<b>📍 Tu ubicación actual</b>', { maxWidth: 200 });
          userMarkerRef.current = marker;
          setLocationError(null);
        },
        () => {
          setLocationError('Para ver a los vehiculos activos debe activar la Ubicacion de su dispositivo');
        }
      );
    } else {
      setLocationError('Para ver a los vehiculos activos debe activar la Ubicacion de su dispositivo');
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update vehicle markers when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove stale markers
    vehicleMarkersRef.current.forEach((marker, id) => {
      if (!activeVehicles.find(v => v._id === id)) {
        map.removeLayer(marker);
        vehicleMarkersRef.current.delete(id);
      }
    });

    // Add / update vehicle markers
    activeVehicles.forEach((v) => {
      if (!v.ubicacionActual) return;
      const { latitud, longitud, timestamp } = v.ubicacionActual;
      const latlng: L.LatLngExpression = [latitud, longitud];
      const lastSeen = timestamp
        ? new Date(timestamp).toLocaleString('es-CL')
        : 'Desconocido';

      const existing = vehicleMarkersRef.current.get(v._id);
      if (existing) {
        existing.setLatLng(latlng);
        existing.setPopupContent(`
          <div style="font-family:system-ui;min-width:160px">
            <div style="font-weight:700;font-size:1rem;margin-bottom:4px;color:#000;">🚗 ${v.marca} ${v.modelo}</div>
            <div style="color:#444;font-size:.85rem;margin-bottom:2px"><b>Conductor:</b> ${v.conductor || 'No asignado'}</div>
            <div style="color:#444;font-size:.85rem;margin-bottom:4px"><b>Depto:</b> ${v.departamento || 'No asignado'}</div>
            <div style="color:#666;font-size:.85rem"><b>Patente:</b> ${v.placa}</div>
            <div style="color:#666;font-size:.85rem"><b>Última señal:</b><br>${lastSeen}</div>
          </div>`);
      } else {
        const marker = L.marker(latlng, { icon: VEHICLE_ICON })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:system-ui;min-width:160px">
              <div style="font-weight:700;font-size:1rem;margin-bottom:4px;color:#000;">🚗 ${v.marca} ${v.modelo}</div>
              <div style="color:#444;font-size:.85rem;margin-bottom:2px"><b>Conductor:</b> ${v.conductor || 'No asignado'}</div>
              <div style="color:#444;font-size:.85rem;margin-bottom:4px"><b>Depto:</b> ${v.departamento || 'No asignado'}</div>
              <div style="color:#666;font-size:.85rem"><b>Patente:</b> ${v.placa}</div>
              <div style="color:#666;font-size:.85rem"><b>Última señal:</b><br>${lastSeen}</div>
            </div>`, { maxWidth: 250 });
        vehicleMarkersRef.current.set(v._id, marker);
      }
    });
  }, [activeVehicles]);

  // Auto-refresh every 3 minutes + countdown
  useEffect(() => {
    fetchActiveVehicles();

    intervalRef.current = setInterval(() => {
      fetchActiveVehicles();
      setCountdown(60);
    }, 60000);

    const countdownTimer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 60 : prev - 1));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(countdownTimer);
    };
  }, [fetchActiveVehicles]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleManualRefresh = () => {
    fetchActiveVehicles();
    setCountdown(60);
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 15);
      userMarkerRef.current?.openPopup();
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700', color: '#000' }}>
          Vehículos Activos
        </h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {!locationError && isAdmin && (
            <span style={{
              fontSize: '0.9rem', fontWeight: '600', color: '#ffffffff', background: '#629effff',
              padding: '0.2rem 1rem', borderRadius: '8px', border: '2px solid #000000ff',
              display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box'
            }}>
              Actualización en:&nbsp;<strong>{formatCountdown(countdown)}</strong>
            </span>
          )}
          {userLocation && (
            <button
              onClick={centerOnUser}
              style={{
                background: '#3b82f6', color: 'white', border: '2px solid #000000ff', borderRadius: '8px',
                padding: '0.4rem 1rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem',
                display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box'
              }}
            >
              Mi Ubicación
            </button>
          )}
          {/* !locationError && isAdmin && (
            <button
              onClick={handleManualRefresh}
              disabled={loadingVehicles}
              style={{
                background: loadingVehicles ? '#9ca3af' : '#175fbd',
                color: 'white', border: '2px solid #000000ff', borderRadius: '8px',
                padding: '0.4rem 1rem',
                cursor: loadingVehicles ? 'not-allowed' : 'pointer',
                fontWeight: '600', fontSize: '0.9rem',
                display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box'
              }}
            >
              {loadingVehicles ? ' Actualizando…' : '⟳ Actualizar ahora'}
            </button>
          ) */}
        </div>
      </div>

      {/* Location error */}
      {locationError && (
        <div style={{
          background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px',
          padding: '0.6rem 1rem', fontSize: '0.9rem', color: '#92400e'
        }}>
          ⚠️ {locationError}
        </div>
      )}

      {/* Info cards (admin) */}
      {!locationError && isAdmin && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{
            flex: 1, minWidth: '140px', background: '#f0f9ff', border: '1px solid #bae6fd',
            borderRadius: '12px', padding: '1rem', textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#0284c7' }}>
              {activeVehicles.length}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#0369a1', fontWeight: '600' }}>
              Vehículos en curso
            </div>
          </div>
          {lastUpdated ? (
            <div style={{
              flex: 2, minWidth: '180px', background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
            }}>
              <span style={{ fontSize: '1.5rem' }}></span>
              <div>
                <div style={{ fontWeight: '700', color: '#15803d', fontSize: '0.9rem' }}>Última actualización</div>
                <div style={{ color: '#16a34a', fontSize: '0.85rem' }}>
                  {lastUpdated.toLocaleTimeString('es-CL')}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              flex: 2, minWidth: '180px', background: '#f9fafb', border: '1px solid #e5e7eb',
              borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
              color: '#6b7280'
            }}>
              <span style={{ fontSize: '1.5rem' }}></span>
              <div style={{ fontSize: '0.85rem' }}>Sin vehículos en curso ahora</div>
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div style={{
        display: locationError ? 'none' : 'block',
        borderRadius: '12px', overflow: 'hidden',
        border: '2px solid #e5e7eb',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        height: '480px', position: 'relative'
      }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Vehicle table (admin + vehicles exist) */}
      {!locationError && isAdmin && activeVehicles.length > 0 && (
        <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          <div style={{ background: '#033a83ff', color: 'white', padding: '0.75rem 1.25rem', fontWeight: '700', fontSize: '1rem', textAlign: 'center' }}>
            Detalle de Vehículos en Curso
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ borderRadius: 0, boxShadow: 'none', fontSize: '0.95rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.6rem 1rem' }}>Vehículo</th>
                  <th style={{ padding: '0.6rem 1rem' }}>Patente</th>
                  <th style={{ padding: '0.6rem 1rem' }}>Última señal GPS</th>
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {activeVehicles.map((v) => (
                  <tr key={v._id}>
                    <td style={{ padding: '0.6rem 1rem' }}>{v.marca} {v.modelo}</td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <span style={{
                        background: '#f59e0b', color: 'white', padding: '0.2rem 0.6rem',
                        borderRadius: '6px', fontWeight: '700', fontSize: '0.85rem'
                      }}>
                        {v.placa}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      {v.ubicacionActual
                        ? new Date(v.ubicacionActual.timestamp).toLocaleString('es-CL')
                        : <span style={{ color: '#ef4444' }}>Sin señal GPS</span>}
                    </td>
                    <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                      {v.ubicacionActual && (
                        <button
                          onClick={() => {
                            if (mapRef.current && v.ubicacionActual) {
                              mapRef.current.setView(
                                [v.ubicacionActual.latitud, v.ubicacionActual.longitud], 16
                              );
                              vehicleMarkersRef.current.get(v._id)?.openPopup();
                            }
                          }}
                          style={{
                            background: '#175fbd', color: 'white', border: 'none',
                            borderRadius: '6px', padding: '0.3rem 0.8rem',
                            cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600'
                          }}
                        >
                          Ver en mapa
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
