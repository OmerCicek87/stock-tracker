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

      // If not authenticated AND not on login/register → force login
      if (!u && !isAuthPage) {
        nav('/login');
      }

      // If authenticated and currently on login/register → go to home
      if (u && isAuthPage) {
        nav('/');
      }
    });

    return unsubscribe;
  }, [nav, location]);

  const register = (email, pwd) =>
    createUserWithEmailAndPassword(auth, email, pwd); // no nav, auth state handles it

  const login = (email, pwd) =>
    signInWithEmailAndPassword(auth, email, pwd); // no nav, auth state handles it

  const logout = () => signOut(auth); // nav handled in auth listener

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
