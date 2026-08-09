import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/bit-mejorado.png';

function Login() {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaVencimientoLicencia, setFechaVencimientoLicencia] = useState('');
  const [licenciaFotoFile, setLicenciaFotoFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const isLicenciaAlDia = fechaVencimientoLicencia
    ? new Date(fechaVencimientoLicencia) >= new Date(new Date().setHours(0, 0, 0, 0))
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegistering) {
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }
      if (telefono.length !== 8) {
        setError('El teléfono debe tener exactamente 8 dígitos');
        return;
      }
      if (!email.toLowerCase().endsWith('@empresa.com')) {
        setError('El correo debe pertenecer a la empresa (@empresa.com)');
        return;
      }
    }

    try {
      let fetchOptions: RequestInit = {};
      const endpoint = isRegistering
        ? 'http://10.99.41.176:5000/api/auth/register'
        : 'http://10.99.41.176:5000/api/auth/login';

      if (isRegistering) {
        if (!licenciaFotoFile) {
          setError('La foto de la licencia es obligatoria');
          return;
        }
        const formData = new FormData();
        formData.append('nombre', nombre);
        formData.append('apellido', apellido);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('departamento', departamento || 'Operaciones');
        formData.append('telefono', `+569${telefono}`);
        formData.append('fechaVencimientoLicencia', fechaVencimientoLicencia);
        if (isLicenciaAlDia !== null) {
          formData.append('licenciaAlDia', String(isLicenciaAlDia));
        }
        formData.append('licenciaFoto', licenciaFotoFile);

        fetchOptions = {
          method: 'POST',
          body: formData,
        };
      } else {
        fetchOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        };
      }

      const response = await fetch(endpoint, fetchOptions);

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
      <div className={`logo-container ${isRegistering ? 'logo-right' : ''}`}>
        <img src={logo} alt="Bitnets" className="logo-img" />
        <span className="logo-text">Bitnets</span>
      </div>
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
            <div className="form-group">
              <label>Departamento</label>
              <input type="text" value={departamento} onChange={e => setDepartamento(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <span style={{ padding: '7.4px 12px', background: '#7c7c7cff', borderRight: 'none', borderRadius: '6px 0 0 6px', color: '#333', fontWeight: 'bold' }}>+569</span>
                <input
                  type="text"
                  maxLength={8}
                  placeholder="12345678"
                  value={telefono}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setTelefono(val);
                  }}
                  style={{ flex: 1, borderRadius: '0 6px 6px 0' }}
                />
              </div>
            </div>
          </>
        )}

        <div className="form-group">
          <label htmlFor="email">Escriba su Email</label>
          <input
            type="email" id="email" name="email" value={email}
            placeholder="persona@empresa.com"
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
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <input type="date" value={fechaVencimientoLicencia} onChange={e => setFechaVencimientoLicencia(e.target.value)} required />
                {isLicenciaAlDia !== null && (
                  <p style={{ marginTop: '5px', fontSize: '0.9rem', color: isLicenciaAlDia ? 'green' : 'red', fontWeight: 'bold', textAlign: 'center' }}>
                    {isLicenciaAlDia ? '✔ Al Día' : '❌ No Está Al Día'}
                  </p>
                )}
              </div>
            </div>
            <div className="form-group">
              <label>Foto de la Licencia</label>
              <input type="file" accept="image/*" onChange={e => setLicenciaFotoFile(e.target.files?.[0] || null)} required />
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
              <button type="button" className="btn btn-back" style={{ flex: 1, margin: 0 }} onClick={() => setIsRegistering(false)}>Cancelar</button>
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
