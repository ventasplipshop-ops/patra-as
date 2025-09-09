import React, { useState } from "react";
import { Store, CreditCard, BarChart3, Scan } from "lucide-react";
import { useAuth } from "../context/AuthContext"; // 👈 importa tu context
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await signIn(email, password);
    if (error) {
      setError(error.message);
    }
     else {
      navigate("/"); // 👈 redirigir al home o dashboard
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto flex items-center min-h-screen">
        <div className="w-full grid lg:grid-cols-2 gap-12 items-center">

          {/* Izquierda - Branding */}
          <div className="space-y-8">

                      
            <div className="flex items-center space-x-3 mb-8">
              <div className="bg-emerald-600 rounded-xl p-3">
                <Store className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">RetailMax</h1>
                <p className="text-emerald-600 font-medium">Point of Sale System</p>
              </div>
            </div>

            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
                La solución completa para tu <span className="text-emerald-600">retail</span>
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                Optimiza tus ventas, gestiona tu inventario y conecta con tus clientes. 
                Todo en una plataforma diseñada para hacer crecer tu negocio.
              </p>
            


          </div>
          </div>

          {/* Derecha - Login Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8 lg:p-10">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Iniciar Sesión</h3>
              <p className="text-gray-600">Accede a tu panel de administración</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Correo</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="ejemplo@tienda.com"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Tu contraseña"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                Acceder al Sistema
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
