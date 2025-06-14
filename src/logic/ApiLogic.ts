import { endpoints } from "../constants/SubsonicEndpoints";
import { useApiStore } from "../store/ApiStore";
import makeRequest from "../utils/MakeRequest";
import CryptoJS from "crypto-js";

export const login = async (url: string, username: string, password: string, stayLoggedIn: boolean) => {
  const { setUrl, setAuthParams } = useApiStore.getState();

  const salt = Math.random().toString(36).slice(2, 8);
  const token = CryptoJS.MD5(password + salt).toString();

  let res: Response;
  try {
    res = await makeRequest(url, endpoints.album.getRandomSongs, {
      method: "GET",
      queryParams: {
        u: username,
        t: token,
        s: salt,
        v: "1.16.1",
        c: "4Sonic",
        f: "json",
        size: 1,
      },
    });
  }
  catch {
    throw new Error("Unable to reach server.");
  }

  if (!res.ok) {
    throw new Error(`Server responded with status ${res.status}.`);
  }

  const json = await res.json();
  const subsonicRes = json["subsonic-response"];

  if (subsonicRes.error) {
    throw new Error(subsonicRes.error.message || "Login failed.");
  }

  setUrl(url);
  setAuthParams({
    u: username,
    t: token,
    s: salt,
    v: "1.16.1",
    c: "4Sonic",
    f: "json",
  });

  if (stayLoggedIn) {
    localStorage.setItem("server_url", url);
    localStorage.setItem(
      "server_auth_params",
      JSON.stringify({
        u: username,
        t: token,
        s: salt,
        v: "1.16.1",
        c: "4Sonic",
        f: "json",
      }),
    );
  }
};
