// otp.helpers.ts
import crypto from "crypto";

export const OTP_EXP_SECONDS = 5 * 60; // 5 minutes

export const generateOtp = (length = 6) =>
  crypto.randomInt(10 ** (length - 1), 10 ** length).toString();

export const futureDate = (sec: number) => new Date(Date.now() + sec * 1000);
