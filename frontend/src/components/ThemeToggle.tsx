import { useState, useEffect } from 'react';
import '../index.css';

function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  return (
    <div className="theme-switch-wrapper" style={{ position: 'fixed', top: '22px', left: '20px', zIndex: 1000 }}>
      <label className="theme-switch">
        <input 
          type="checkbox" 
          checked={isDarkMode} 
          onChange={(e) => setIsDarkMode(e.target.checked)} 
        />
        <div className="theme-slider">
          <span className="theme-icon-sun">☼</span>
          <span className="theme-icon-moon">☾</span>
        </div>
      </label>
    </div>
  );
}

export default ThemeToggle;
