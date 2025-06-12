import { createContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, useLocation } from 'react-router-dom';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);

      const isAuthPage =
        location.pathname === '/login' || location.pathname === '/register';

      if (!u && !isAuthPage) {
        nav('/login');
      }
      if (u && isAuthPage) {
        nav('/');
      }
    });

    return unsubscribe;
  }, [nav, location]);

  const register = (email, pwd) =>
    createUserWithEmailAndPassword(auth, email, pwd);

  const login = (email, pwd) =>
    signInWithEmailAndPassword(auth, email, pwd);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
