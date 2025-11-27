import { ChangeEvent, FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Checkbox from "../components/ui/Checkbox";
import Spinner from "../components/ui/Spinner";
import TextInput from "../components/ui/TextInput";
import { LoginPayload, useAuthStore } from "../store/authStore";

interface LocationState {
  from?: string;
}

const DEFAULT_SERVER_URL = (import.meta.env.VITE_DEFAULT_SERVER_URL ?? "").trim();
const HAS_DEFAULT_SERVER_URL = Boolean(DEFAULT_SERVER_URL);

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const status = useAuthStore((state) => state.status);
  const storeError = useAuthStore((state) => state.error);

  const [formState, setFormState] = useState<LoginPayload>({
    serverUrl: DEFAULT_SERVER_URL,
    username: "",
    password: "",
    stayLoggedIn: true,
  });
  const [localError, setLocalError] = useState<string | undefined>();

  const isSubmitting = status === "authenticating";

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(undefined);

    try {
      await login(formState);
      const state = location.state as LocationState | undefined;
      const nextRoute = state?.from ?? "/";
      navigate(nextRoute, { replace: true });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Unable to log in");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--surface0) px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-(--surface2) bg-(--surface0) p-8 shadow-lg">
        <h1 className="text-2xl font-semibold text-(--text)">Welcome to 4Sonic</h1>
        <p className="mt-2 text-sm text-(--text-grey)">Connect your Navidrome/Subsonic server to get started.</p>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {!HAS_DEFAULT_SERVER_URL && (
            <div>
              <label htmlFor="serverUrl" className="text-sm font-medium text-(--text)">
                Server URL
              </label>
              <TextInput
                id="serverUrl"
                name="serverUrl"
                type="url"
                required
                placeholder="https://my-navidrome.example.com"
                value={formState.serverUrl}
                onChange={handleChange}
                className="mt-2"
                autoComplete="url"
              />
            </div>
          )}

          <div>
            <label htmlFor="username" className="text-sm font-medium text-(--text)">
              Username
            </label>
            <TextInput
              id="username"
              name="username"
              type="text"
              required
              placeholder="user"
              value={formState.username}
              onChange={handleChange}
              className="mt-2"
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-medium text-(--text)">
              Password
            </label>
            <TextInput
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              value={formState.password}
              onChange={handleChange}
              className="mt-2"
              autoComplete="current-password"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formState.stayLoggedIn}
                onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, stayLoggedIn: checked }))}
                aria-label="Stay logged in"
              />
              <span className="text-sm text-(--text)">Stay logged in</span>
            </div>
          </div>

          {(localError || storeError) && (
            <div className="rounded-2xl border border-(--danger1) bg-(--danger2) px-4 py-3 text-sm text-(--danger0)">
              {localError ?? storeError}
            </div>
          )}

          <Button
            type="submit"
            size="large"
            variant="primary"
            className="w-full font-semibold text-(--dark)"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Spinner size="sm" showLabel label="Connecting..." color="text-(--dark)" /> : "Connect"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
