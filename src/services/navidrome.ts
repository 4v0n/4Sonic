export const ping = async (
  server: string,
  username: string,
  token: string,
  salt: string,
) => {
  const url = `${server}/rest/ping.view?u=${encodeURIComponent(
    username,
  )}&t=${token}&s=${salt}&v=1.16.1&c=4Sonic&f=json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Network error");
  }
  const json = await res.json();
  if (json["subsonic-response"].status !== "ok") {
    throw new Error("Auth failed");
  }
  return json;
};

