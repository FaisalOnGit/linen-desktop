import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const LoginPage = ({ onLoginSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("sooyaa445566@email.com");
  const [password, setPassword] = useState("mypassword123");

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    // di sini nanti bisa tambahkan validasi / API login
    if (email && password) {
      onLoginSuccess(); // 👈 arahkan ke halaman utama
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(to bottom, #ffffff 0%, #426BA8 100%)",
      }}
    >
      {/* Logo */}
      <div className="absolute top-8 left-8">
        <img src="/login.png" alt="OSLA Logo" className="w-20 h-20" />
      </div>

      {/* Login Form */}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl p-8 shadow-lg">
          <h1 className="text-2xl font-semibold text-gray-800 text-center mb-8">
            Welcome back
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

            {/* Forgot Password */}
            <div className="text-right mb-6">
              <a
                href="#"
                className="text-gray-500 text-sm hover:text-blue-600 transition-colors"
              >
                Forgot password?
              </a>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full bg-primary text-white font-medium py-3 px-4 rounded-xl transition-colors duration-200 mb-6"
              style={{
                backgroundColor: "#426BA8",
              }}
            >
              Login
            </button>
          </form>
        </div>

        {/* Sign Up Link */}
        <div className="text-center mt-6">
          <p className="text-gray-700">
            Don't have an account yet?{" "}
            <a
              href="#"
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
