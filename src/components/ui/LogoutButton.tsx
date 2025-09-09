// src/components/LogoutButton.tsx
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut();            // limpia user y localStorage
    navigate("/login");   // redirige al login
  };

  return (
    <button
      onClick={handleLogout}
      className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg"
    >
      Cerrar sesión
    </button>
  );
}
