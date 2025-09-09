import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Interfaz del usuario basada en tu tabla
interface UserData {
  id: number;
  nombre: string;
  email: string;
  cargo: string;
  area: string;
  telefono: string;
  sede: string;
  estado: string;
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar sesión si hay en localStorage
useEffect(() => {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    const parsed = JSON.parse(storedUser);
    // acá deberías consultar a Supabase si sigue activo
    supabase.from("users").select("id").eq("id", parsed.id).single()
      .then(({ data, error }) => {
        if (data) {
          setUser(parsed);
        } else {
          setUser(null);
          localStorage.removeItem("user");
        }
        setLoading(false);
      });
  } else {
    setLoading(false);
  }
}, []);


  // Login usando email y password
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !data) return { error: new Error('Correo o contraseña incorrectos') };

    const userData: UserData = {
      id: data.id,
      nombre: data.nombre,
      email: data.email,
      cargo: data.cargo,
      area: data.area,
      telefono: data.telefono,
      sede: data.sede,
      estado: data.estado,
    };

    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));

    return { error: null };
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
