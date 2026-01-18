export const generateTempPassword = (length = 12) =>
  require("crypto").randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);