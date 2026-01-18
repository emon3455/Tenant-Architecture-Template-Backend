import dotenv from "dotenv";
import { production, staging } from "../constant/constant";

dotenv.config();

interface EnvConfig {
  PORT: string;
  DB_URL: string;
  ENC_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLIC_KEY: string;
  ALGORITHM: string;
  NODE_ENV: "development" | "production";
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_EXPIRES: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES: string;
  SUPER_ADMIN_EMAIL: string;
  SUPER_ADMIN_PASSWORD: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CALLBACK_URL: string;
  EXPRESS_SESSION_SECRET: string;
  FRONTEND_URL: string;
  FRONTEND_BASE_URL: string;
  BACKEND_URL: string;
  EMAIL_SENDER: {
    SMTP_USER: string;
    SMTP_PASS: string;
    SMTP_PORT: string;
    SMTP_HOST: string;
    SMTP_FROM: string;
  };
  JWT_RESET_EXPIRES: string;
  JWT_RESET_SECRET: string;

  // Calendly OAuth
  CALENDLY_AUTH_BASE_URL: string;
  CALENDLY_API_BASE_URL: string;
  CALENDLY_CLIENT_ID: string;
  CALENDLY_CLIENT_SECRET: string;
  CALENDLY_REDIRECT_URI: string;

  // Google OAuth (for Google Ads, Calendar, Meet)
  GOOGLE_OAUTH_REDIRECT_URI: string;
  GOOGLE_DEVELOPER_TOKEN: string;

  // Org Google Meet OAuth
  ORG_GOOGLE_MEET_REDIRECT_URI: string;

  // Zoom OAuth
  ZOOM_CLIENT_ID: string;
  ZOOM_CLIENT_SECRET: string;
  ORG_ZOOM_REDIRECT_URI: string;

  // Stripe Connect OAuth
  ORG_STRIPE_CLIENT_ID: string;
  ORG_STRIPE_REDIRECT_URI: string;
  ORG_STRIPE_SECRET_KEY: string;

  // Facebook Ads
  FACEBOOK_APP_ID: string;
  FACEBOOK_APP_SECRET: string;
  FACEBOOK_API_VERSION: string;

  // Admin Secret Key for Seeder Operations
  ADMIN_SECRET_KEY: string;
}

const loadEnvVariables = (): EnvConfig => {
  const normalizeBaseUrl = (raw: string | undefined, fallback: string) => {
    const trimmed = (raw || "").trim();
    const base = trimmed ? trimmed : fallback;
    return base.replace(/\/+$/, "");
  };

  const requiredEnvVariables: string[] = [
    "PORT",
    "DB_URL_PROD",
    "DB_URL",
    "ENC_KEY",
    // "STRIPE_SECRET_KEY", // Made optional - not required for all deployments
    // "STRIPE_PUBLIC_KEY", // Made optional - not required for all deployments
    "ALGORITHM",
    "NODE_ENV",
    "JWT_ACCESS_EXPIRES",
    "JWT_ACCESS_SECRET",
    "SUPER_ADMIN_EMAIL",
    "SUPER_ADMIN_PASSWORD",
    "JWT_REFRESH_SECRET",
    "JWT_REFRESH_EXPIRES",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CALLBACK_URL",
    "EXPRESS_SESSION_SECRET",
    "FRONTEND_URL",
    "BACKEND_URL",
    "SMTP_PASS",
    "SMTP_PORT",
    "SMTP_HOST",
    "SMTP_USER",
    "SMTP_FROM",
    "JWT_RESET_EXPIRES",
    "JWT_RESET_SECRET",
  ];

  requiredEnvVariables.forEach((key) => {
    if (!process.env[key]) {
      throw new Error(`Missing require environment variabl ${key}`);
    }
  });

  const frontendUrl = production ? process.env.FRONTEND_URL_PROD : staging ? process.env.FRONTEND_URL_STAGING : process.env.FRONTEND_URL;

  return {
    PORT: production ? process.env.PORT_PROD! : staging ? process.env.PORT_STAGING! : process.env.PORT!,
    ENC_KEY: process.env.ENC_KEY as string,
    STRIPE_SECRET_KEY: production ? (process.env.STRIPE_SECRET_KEY_PROD || "") : staging ? (process.env.STRIPE_SECRET_KEY_STAGING || "") : (process.env.STRIPE_SECRET_KEY || ""),
    STRIPE_PUBLIC_KEY: production ? (process.env.STRIPE_PUBLIC_KEY_PROD || "") : staging ? (process.env.STRIPE_PUBLIC_KEY_STAGING || "") : (process.env.STRIPE_PUBLIC_KEY || ""),
    ALGORITHM: process.env.ALGORITHM as string,
    DB_URL: production ? process.env.DB_URL_PROD! : staging ? process.env.DB_URL_STAGING! : process.env.DB_URL!,
    NODE_ENV: process.env.NODE_ENV as "development" | "production",
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET as string,
    JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES as string,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
    JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES as string,
    SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL as string,
    SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD as string,
    GOOGLE_CLIENT_SECRET: production ? process.env.GOOGLE_CLIENT_SECRET_PROD! : staging ? process.env.GOOGLE_CLIENT_SECRET_STAGING! : process.env.GOOGLE_CLIENT_SECRET!,
    GOOGLE_CLIENT_ID: production ? process.env.GOOGLE_CLIENT_ID_PROD! : staging ? process.env.GOOGLE_CLIENT_ID_STAGING! : process.env.GOOGLE_CLIENT_ID!,
    GOOGLE_CALLBACK_URL: production ? process.env.GOOGLE_CALLBACK_URL_PROD! : staging ? process.env.GOOGLE_CALLBACK_URL_STAGING! : process.env.GOOGLE_CALLBACK_URL!,
    EXPRESS_SESSION_SECRET: process.env.EXPRESS_SESSION_SECRET as string,
    FRONTEND_URL: production ? process.env.FRONTEND_URL_PROD! : staging ? process.env.FRONTEND_URL_STAGING! : process.env.FRONTEND_URL!,
    FRONTEND_BASE_URL: normalizeBaseUrl(frontendUrl, "http://localhost:5173"),
    BACKEND_URL: production ? process.env.BACKEND_URL_PROD! : staging ? process.env.BACKEND_URL_STAGING! : process.env.BACKEND_URL!,
    EMAIL_SENDER: {
      SMTP_USER: production ? process.env.SMTP_USER_PROD as string : staging ? process.env.SMTP_USER_STAGING as string : process.env.SMTP_USER as string,
      SMTP_PASS: production ? process.env.SMTP_PASS_PROD as string : staging ? process.env.SMTP_PASS_STAGING as string : process.env.SMTP_PASS as string,
      SMTP_PORT: production ? process.env.SMTP_PORT_PROD as string : staging ? process.env.SMTP_PORT_STAGING as string : process.env.SMTP_PORT as string,
      SMTP_HOST: production ? process.env.SMTP_HOST_PROD as string : staging ? process.env.SMTP_HOST_STAGING as string : process.env.SMTP_HOST as string,
      SMTP_FROM: production ? process.env.SMTP_FROM_PROD as string : staging ? process.env.SMTP_FROM_STAGING as string : process.env.SMTP_FROM as string,
    },
    JWT_RESET_EXPIRES: process.env.JWT_RESET_EXPIRES as string,
    JWT_RESET_SECRET: process.env.JWT_RESET_SECRET as string,

    // Calendly OAuth
    CALENDLY_AUTH_BASE_URL: production
      ? (process.env.CALENDLY_AUTH_BASE_URL_PROD || process.env.CALENDLY_AUTH_BASE_URL || "https://auth.calendly.com")
      : staging
        ? (process.env.CALENDLY_AUTH_BASE_URL_STAGING || process.env.CALENDLY_AUTH_BASE_URL || "https://auth.calendly.com")
        : (process.env.CALENDLY_AUTH_BASE_URL || "https://auth.calendly.com"),
    CALENDLY_API_BASE_URL: production
      ? (process.env.CALENDLY_API_BASE_URL_PROD || process.env.CALENDLY_API_BASE_URL || "https://api.calendly.com")
      : staging
        ? (process.env.CALENDLY_API_BASE_URL_STAGING || process.env.CALENDLY_API_BASE_URL || "https://api.calendly.com")
        : (process.env.CALENDLY_API_BASE_URL || "https://api.calendly.com"),
    CALENDLY_CLIENT_ID: production
      ? (process.env.CLIENT_ID_PROD || process.env.CLIENT_ID || "")
      : staging
        ? (process.env.CLIENT_ID_STAGING || process.env.CLIENT_ID || "")
        : (process.env.CLIENT_ID || process.env.CLIENT_ID_PROD || ""),
    CALENDLY_CLIENT_SECRET: production
      ? (process.env.CLIENT_SECRET_PROD || process.env.CLIENT_SECRET || "")
      : staging
        ? (process.env.CLIENT_SECRET_STAGING || process.env.CLIENT_SECRET || "")
        : (process.env.CLIENT_SECRET || process.env.CLIENT_SECRET_PROD || ""),
    CALENDLY_REDIRECT_URI: production
      ? (process.env.CALENDLY_REDIRECT_URI_PROD || process.env.CALENDLY_REDIRECT_URI || "")
      : staging
        ? (process.env.CALENDLY_REDIRECT_URI_STAGING || process.env.CALENDLY_REDIRECT_URI || "")
        : (process.env.CALENDLY_REDIRECT_URI || process.env.CALENDLY_REDIRECT_URI_PROD || ""),

    // Google OAuth (for Google Ads, Calendar, Meet)
    GOOGLE_OAUTH_REDIRECT_URI: production
      ? (process.env.GOOGLE_OAUTH_REDIRECT_URI_PROD || process.env.GOOGLE_OAUTH_REDIRECT_URI || "https://app.tainc.org/auth/google/callback")
      : staging
        ? (process.env.GOOGLE_OAUTH_REDIRECT_URI_STAGING || process.env.GOOGLE_OAUTH_REDIRECT_URI || "https://crm.octopi-digital.com/auth/google/callback")
        : (process.env.GOOGLE_OAUTH_REDIRECT_URI || process.env.GOOGLE_OAUTH_REDIRECT_URI_PROD || "http://localhost:5173/auth/google/callback"),
    GOOGLE_DEVELOPER_TOKEN: production
      ? (process.env.GOOGLE_DEVELOPER_TOKEN_PROD || process.env.GOOGLE_DEVELOPER_TOKEN || "")
      : staging
        ? (process.env.GOOGLE_DEVELOPER_TOKEN_STAGING || process.env.GOOGLE_DEVELOPER_TOKEN || "")
        : (process.env.GOOGLE_DEVELOPER_TOKEN || process.env.GOOGLE_DEVELOPER_TOKEN_PROD || ""),

    // Org Google Meet OAuth
    ORG_GOOGLE_MEET_REDIRECT_URI: production
      ? (process.env.ORG_GOOGLE_MEET_REDIRECT_URI_PROD || process.env.ORG_GOOGLE_MEET_REDIRECT_URI || "")
      : staging
        ? (process.env.ORG_GOOGLE_MEET_REDIRECT_URI_STAGING || process.env.ORG_GOOGLE_MEET_REDIRECT_URI || "")
        : (process.env.ORG_GOOGLE_MEET_REDIRECT_URI || process.env.ORG_GOOGLE_MEET_REDIRECT_URI_PROD || ""),

    // Zoom OAuth
    ZOOM_CLIENT_ID: production
      ? (process.env.ZOOM_CLIENT_ID_PROD || process.env.ZOOM_CLIENT_ID || "")
      : staging
        ? (process.env.ZOOM_CLIENT_ID_STAGING || process.env.ZOOM_CLIENT_ID || "")
        : (process.env.ZOOM_CLIENT_ID || process.env.ZOOM_CLIENT_ID_PROD || ""),
    ZOOM_CLIENT_SECRET: production
      ? (process.env.ZOOM_CLIENT_SECRET_PROD || process.env.ZOOM_CLIENT_SECRET || "")
      : staging
        ? (process.env.ZOOM_CLIENT_SECRET_STAGING || process.env.ZOOM_CLIENT_SECRET || "")
        : (process.env.ZOOM_CLIENT_SECRET || process.env.ZOOM_CLIENT_SECRET_PROD || ""),
    ORG_ZOOM_REDIRECT_URI: production
      ? (process.env.ORG_ZOOM_REDIRECT_URI_PROD || process.env.ORG_ZOOM_REDIRECT_URI || process.env.ZOOM_REDIRECT_URI_PROD || process.env.ZOOM_REDIRECT_URI || "")
      : staging
        ? (process.env.ORG_ZOOM_REDIRECT_URI_STAGING || process.env.ORG_ZOOM_REDIRECT_URI || process.env.ZOOM_REDIRECT_URI_STAGING || process.env.ZOOM_REDIRECT_URI || "")
        : (process.env.ORG_ZOOM_REDIRECT_URI || process.env.ORG_ZOOM_REDIRECT_URI_PROD || process.env.ZOOM_REDIRECT_URI || process.env.ZOOM_REDIRECT_URI_PROD || ""),

    // Stripe Connect OAuth
    ORG_STRIPE_CLIENT_ID: production
      ? (process.env.ORG_STRIPE_CLIENT_ID_PROD || process.env.ORG_STRIPE_CLIENT_ID || "")
      : staging
        ? (process.env.ORG_STRIPE_CLIENT_ID_STAGING || process.env.ORG_STRIPE_CLIENT_ID || "")
        : (process.env.ORG_STRIPE_CLIENT_ID || process.env.ORG_STRIPE_CLIENT_ID_PROD || ""),
    ORG_STRIPE_REDIRECT_URI: production
      ? (process.env.ORG_STRIPE_REDIRECT_URI_PROD || process.env.ORG_STRIPE_REDIRECT_URI || "")
      : staging
        ? (process.env.ORG_STRIPE_REDIRECT_URI_STAGING || process.env.ORG_STRIPE_REDIRECT_URI || "")
        : (process.env.ORG_STRIPE_REDIRECT_URI || process.env.ORG_STRIPE_REDIRECT_URI_PROD || ""),
    ORG_STRIPE_SECRET_KEY: production
      ? (process.env.ORG_STRIPE_SECRET_KEY_PROD || process.env.ORG_STRIPE_SECRET_KEY || "")
      : staging
        ? (process.env.ORG_STRIPE_SECRET_KEY_STAGING || process.env.ORG_STRIPE_SECRET_KEY || "")
        : (process.env.ORG_STRIPE_SECRET_KEY || process.env.ORG_STRIPE_SECRET_KEY_PROD || ""),

    // Facebook Ads
    FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID || "",
    FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET || "",
    FACEBOOK_API_VERSION: process.env.FACEBOOK_API_VERSION || "v19.0",

    // Admin Secret Key for Seeder Operations
    ADMIN_SECRET_KEY: process.env.ADMIN_SECRET_KEY || "change-me-in-production",
  };
};

export const envVars = loadEnvVariables();
