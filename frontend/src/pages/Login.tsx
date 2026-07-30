import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [fechaVencimientoLicencia, setFechaVencimientoLicencia] = useState('');
  const [error, setError] = useState('');

  const isLicenciaAlDia = fechaVencimientoLicencia 
    ? new Date(fechaVencimientoLicencia) >= new Date(new Date().setHours(0,0,0,0))
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegistering && password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      const endpoint = isRegistering ? 'http://localhost:5000/api/auth/register' : 'http://localhost:5000/api/auth/login';
      const bodyPayload = isRegistering 
        ? { nombre, apellido, email, password, fechaVencimientoLicencia, licenciaAlDia: isLicenciaAlDia }
        : { email, password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        if (data.user.rol === 'admin') {
          navigate('/dashboard');
        } else {
          navigate('/vehicles');
        }
      } else {
        setError(data.message || 'Error en la operación');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    }
  };

  return (
    <div className="page">
      <h1>{isRegistering ? 'Crear una Cuenta' : 'Iniciar Sesión'}</h1>
      <form className="login-form" onSubmit={handleSubmit} style={{ width: '100%' }}>
        {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
        
        {isRegistering && (
          <>
            <div className="form-group">
              <label>Nombre</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Apellido</label>
              <input type="text" value={apellido} onChange={e => setApellido(e.target.value)} required />
            </div>
          </>
        )}

        <div className="form-group">
          <label htmlFor="email">Escriba su Email</label>
          <input 
            type="email" id="email" name="email" value={email}
            onChange={(e) => setEmail(e.target.value)} required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Contraseña</label>
          <input 
            type="password" id="password" name="password" value={password}
            onChange={(e) => setPassword(e.target.value)} required
          />
        </div>

        {isRegistering && (
          <>
            <div className="form-group">
              <label>Verificar Contraseña</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Fecha de Vencimiento de Licencia</label>
              <input type="date" value={fechaVencimientoLicencia} onChange={e => setFechaVencimientoLicencia(e.target.value)} required />
              {isLicenciaAlDia !== null && (
                <p style={{ marginTop: '5px', fontSize: '0.9rem', color: isLicenciaAlDia ? 'green' : 'red', fontWeight: 'bold', textAlign: 'center' }}>
                  {isLicenciaAlDia ? '✔ Al Día' : '❌ No Está Al Día'}
                </p>
              )}
            </div>
          </>
        )}

        {!isRegistering ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
            <button type="button" onClick={() => setIsRegistering(true)} style={{ background: 'none', border: 'none', color: 'var(--text-h)', cursor: 'pointer', textDecoration: 'underline', padding: '5px', alignSelf: 'center', fontSize: '1.05rem', fontWeight: 'bold' }}>
              Crear una Cuenta
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn" style={{ flex: 1, margin: 0 }}>Iniciar Sesión</button>
              <button type="button" className="btn btn-back" style={{ flex: 1, margin: 0 }} onClick={() => navigate('/')}>Volver atrás</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn" style={{ flex: 1, margin: 0 }}>Crear Cuenta</button>
              <button type="button" className="btn btn-back" style={{ flex: 1, margin: 0 }} onClick={() => navigate('/')}>Volver atrás</button>
            </div>
            <button type="button" onClick={() => setIsRegistering(false)} style={{ background: 'none', border: 'none', color: 'var(--text-h)', cursor: 'pointer', textDecoration: 'underline', padding: '5px', alignSelf: 'center', fontSize: '1.05rem', fontWeight: 'bold' }}>
              Ya tengo una cuenta (Iniciar Sesión)
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

export default Login;
