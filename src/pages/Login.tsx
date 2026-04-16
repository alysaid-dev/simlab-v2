import { useNavigate } from "react-router";
import logoImage from "@/assets/logo-statistika.png";

export default function Login() {
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    // Mock Google login - in production, this would integrate with Google OAuth
    // For now, just navigate to dashboard
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img
              src={logoImage}
              alt="Laboratorium Statistika UII"
              className="h-20"
            />
          </div>

          {/* Welcome Message */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Selamat Datang
            </h1>
            <p className="text-gray-600 leading-relaxed">
              Sistem Informasi Manajemen Laboratorium Statistika Universitas Islam Indonesia
            </p>
          </div>

          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white border-2 border-gray-300 rounded-lg px-6 py-3 flex items-center justify-center hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
          >
            <span className="text-gray-700 font-medium">
              Masuk dengan Akun UII
            </span>
          </button>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Laboratorium Statistika UII
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}