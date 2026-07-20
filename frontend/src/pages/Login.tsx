function Login() {
  return (
    <div className="page">
      <h1>Iniciar Sesión</h1>
      <form className="login-form">
        <div className="form-group">
          <label htmlFor="email">Escriba su Email</label>
          <input type="email" id="email" name="email" />
        </div>
        <div className="form-group">
          <label htmlFor="password">Contraseña</label>
          <input type="password" id="password" name="password" />
        </div>
        <button type="button" className="btn">Iniciar Sesión</button>
      </form>
    </div>
  );
}

export default Login;
