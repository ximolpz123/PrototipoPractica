import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import loginBg from '../assets/images/login-bg.png';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
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
        setError(data.message || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    }
  };

  return (
    <div className="login-wrapper" style={{ backgroundImage: `url(${loginBg})` }}>
      <div className="login-card">
        <div className="login-header">
          <div className="logo-placeholder">
            <span className="logo-text">BF</span>
          </div>
          <h2>Bitnets Flota</h2>
          <p>Ingrese sus credenciales</p>
        </div>
        
        <form className="login-form-new" onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group-new">
            <input 
              type="email" 
              id="email" 
              name="email" 
              placeholder="Email (Ej: admin@empresa.com)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group-new">
            <input 
              type="password" 
              id="password" 
              name="password" 
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="remember-me">
            <input type="checkbox" id="remember" />
            <label htmlFor="remember">Recuérdame</label>
          </div>
          
          <button type="submit" className="btn-login">INGRESE</button>
        </form>
      </div>
    </div>
  );
}

export default Login;
