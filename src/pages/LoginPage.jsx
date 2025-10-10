import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import LoginLogo from "../../public/login.png";

const LoginPage = ({ onLoginSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const baseUrl = import.meta.env.VITE_BASE_URL;

      const response = await fetch(`${baseUrl}/Auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
          platform_id: 3,
        }),
      });

      const data = await response.json();
      console.log("Login response:", data); // Debug log

      // Handle successful login
      if (data.success === true || data.status === "success") {
        if (data.token || data.data?.token) {
          const token = data.token || data.data?.token;

          try {
            // Save token via preload API
            await window.authAPI.setToken(token);
            console.log("Token saved successfully");

            // Call success callback
            onLoginSuccess();
          } catch (tokenError) {
            console.error("Error saving token:", tokenError);
            setError("Gagal menyimpan token. Coba lagi.");
          }
        } else {
          console.warn("Login successful but no token received");
          setError("Login berhasil tetapi tidak menerima token.");
        }
      } else {
        // Handle login failure - display API message
        const errorMessage = data.message || "Login gagal, periksa email/password.";
        setError(errorMessage);
      }
    } catch (err) {
      console.error("Login error:", err);

      // If it's a failed response with API data, display the API message
      if (err.message.includes("HTTP error")) {
        // Let the response handling above take care of the API message
        const errorMessage = "Login gagal. Cek kembali email dan password.";
        setError(errorMessage);
      } else if (err.name === "TypeError" && err.message.includes("fetch")) {
        setError("Tidak dapat terhubung ke server. Periksa koneksi internet.");
      } else if (err.name === "SyntaxError") {
        setError("Response server tidak valid.");
      } else {
        setError("Terjadi kesalahan. Coba lagi nanti.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(to bottom, #ffffff 0%, #426BA8 100%)",
      }}
    >
      <div className="absolute top-8 left-8">
        <img src={LoginLogo} alt="OSLA Logo" className="w-20 h-20" />
      </div>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl p-8 shadow-lg">
          <h1 className="text-2xl font-semibold text-primary text-center mb-8">
            Selamat Datang
            <span className="text-orange-500"> Admin!</span>
          </h1>

          <form onSubmit={handleLogin}>
            {/* Email Field */}
            <div className="mb-6">
              <label
                htmlFor="email"
                className="block text-gray-700 text-sm font-medium mb-2"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-700"
                placeholder="Enter your email"
              />
            </div>

            {/* Password Field */}
            <div className="mb-2">
              <label
                htmlFor="password"
                className="block text-gray-700 text-sm font-medium mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-700"
                  placeholder="••••••••••••••••"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-red-500 text-sm mt-2 mb-4 text-center">
                {error}
              </p>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-medium py-3 px-4 rounded-xl transition-colors duration-200 mb-6 disabled:opacity-50"
              style={{
                backgroundColor: "#426BA8",
              }}
            >
              {loading ? "Loading..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
