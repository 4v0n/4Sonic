import { useState } from "react";
import { useAuthStore } from "../store/AuthStore";

const LoginPage = () => {
  const login = useAuthStore((s) => s.login);
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await login(serverUrl, username, password);
    if (!ok) {
      setError("Login failed");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-(--surface0)">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 p-6 rounded shadow-md bg-(--surface1)"
      >
        <div className="flex flex-col">
          <label className="mb-1">Server URL</label>
          <input
            className="p-2 border rounded"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="mb-1">Username</label>
          <input
            className="p-2 border rounded"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="mb-1">Password</label>
          <input
            type="password"
            className="p-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-red-500">{error}</p>}
        <button className="w-full p-2 bg-blue-600 text-white rounded" type="submit">
          Login
        </button>
      </form>
    </div>
  );
};

export default LoginPage;

