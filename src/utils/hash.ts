import MD5 from "crypto-js/md5";

export const hashString = (input: string): string => {
  return MD5(input).toString();
};
