const AutoLogin = () => {
  const loginInfo = localStorage.getItem("userLogin");
  if (!loginInfo) return false;

  const data = JSON.parse(loginInfo);

  console.log(data);
};

export const startup = () => {
  console.log("startup");
};