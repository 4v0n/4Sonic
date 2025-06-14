import { useApiStore } from "../store/ApiStore";
import { indexLibrary, libraryNeedsUpdate } from "./LibraryService";

const autoLogin = () => {
  const url = localStorage.getItem("server_url");
  const auth = localStorage.getItem("server_auth_params");
  if (!url || !auth) return false;

  const { setUrl, setAuthParams } = useApiStore.getState();
  setUrl(url);
  setAuthParams(JSON.parse(auth));
  return true;
};

export const startup = async () => {
  const loggedIn = autoLogin();
  if (!loggedIn) return;

  if (await libraryNeedsUpdate()) {
    await indexLibrary();
  }
};