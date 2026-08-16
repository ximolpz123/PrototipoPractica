import React, { createContext, useContext } from 'react';
import type { IUser } from '../types';

interface AuthContextType {
  user: IUser | null;
  handleLogout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  handleLogout: () => {},
});

export const useAuth = () => useContext(AuthContext);
