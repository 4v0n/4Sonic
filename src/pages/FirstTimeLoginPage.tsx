import { useState } from "react";
import Toggle from "../components/ui/Toggle";

function FirstTimeLoginPage() {
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!serverUrl) {
      alert("Please enter a server URL.");
    }

    if (!username) {
      alert("Please enter a username.");
    }

    if (!password) {
      alert("Please enter your password.");
    }

    console.log(serverUrl, username, password);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-(--surface0) text-(--text) p-4 font-sans">
      <div className="w-full max-w-md p-8 space-y-6 bg-(--surface1) rounded-xl shadow-2xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2 text-(--primary0)">
            4<span className="text-(--text)">Sonic</span>
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="serverurl" className="block text-sm font-medium text-(--text-grey) mb-1">
              Server URL
            </label>
            <input
              id="serverurl"
              name="serverurl"
              type="url"
              autoComplete="serverurl"
              required
              placeholder="Server URL"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-(--text-grey) mb-1">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-(--text-grey) mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-(--text-grey) mb-1">
              Stay logged in
            </label>
            <Toggle
              id="stay-logged-in"
              toggled={stayLoggedIn}
              onToggle={() => setStayLoggedIn(!stayLoggedIn)}
            />
          </div>

          <hr className="my-4 border-t border-(--surface2)" />

          {loginError && (
            <p id="login-error" className="text-sm text-(--fail) text-center bg-(--fail)/10 p-2 rounded-md" role="alert">
              {loginError}
            </p>
          )}

          <div>
            <button
              type="submit"
              className="w-full flex justify-center items-center bg-(--primary0) px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-2xl hover:bg-(--primary3) transition-colors cursor-pointer"
            >
              Log In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FirstTimeLoginPage;