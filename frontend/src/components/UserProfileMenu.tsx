import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { IUser } from '../types';
import defaultProfileImg from '../assets/foto-preterminada.png';

function UserProfileMenu() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const storedUser = localStorage.getItem('user');
  const user: IUser | null = storedUser ? JSON.parse(storedUser) : null;
  
  const profileImgKey = user ? `profile_img_${user.id}` : 'profile_img_default';
  const [profileImg, setProfileImg] = useState<string>(
    localStorage.getItem(profileImgKey) || defaultProfileImg
  );

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProfileImg(result);
        localStorage.setItem(profileImgKey, result);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!user) return null;

  return (
    <div className="profile-menu-container" ref={menuRef}>
      <button 
        className="profile-menu-button" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menú de usuario"
      >
        <img src={profileImg} alt="Perfil" className="profile-btn-img" />
      </button>

      {isOpen && (
        <div className="profile-menu-panel">
          <div className="profile-panel-photo-container">
            <img src={profileImg} alt="Perfil grande" className="profile-panel-img" />
            <label className="profile-photo-upload-label">
              Cambiar foto
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                style={{ display: 'none' }} 
              />
            </label>
          </div>
          
          <div className="profile-panel-info">
            <p className="profile-panel-name">
              <strong>{user.rol === 'admin' ? 'Administrador' : 'Conductor'}:</strong> {user.nombre} {user.apellido}
            </p>
            {user.rol !== 'admin' && (
              <p className="profile-panel-license">
                <strong>Estado de su Licencia:</strong> <span className="license-status">AL DIA</span>
              </p>
            )}
          </div>

          <button className="btn btn-logout" onClick={handleLogout}>
            Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );
}

export default UserProfileMenu;
