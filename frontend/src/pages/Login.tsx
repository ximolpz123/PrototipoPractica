import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
        // Guardar token en localStorage (opcional, pero útil para futuras requests)
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirigir según el rol
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
    <div className="page">
      <h1>Iniciar Sesión</h1>
      <form className="login-form" onSubmit={handleSubmit}>
        {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
        <div className="form-group">
          <label htmlFor="email">Escriba su Email</label>
          <input 
            type="email" 
            id="email" 
            name="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Contraseña</label>
          <input 
            type="password" 
            id="password" 
            name="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn">Iniciar Sesión</button>
        <button type="button" className="btn btn-back" onClick={() => navigate('/')}>Volver atrás</button>
      </form>
    </div>
  );
}

export default Login;
