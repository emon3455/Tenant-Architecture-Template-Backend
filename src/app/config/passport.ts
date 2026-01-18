/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import passport from "passport";
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from "passport-google-oauth20";
import { Strategy as LocalStrategy } from "passport-local";
import { Role, IsActive } from "../modules/user/user.interface";
import { User } from "../modules/user/user.model";
import { envVars } from "./env";
import { verifyPassword } from "../utils/hash";

// ---------- Local (email/password) ----------
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email: string, password: string, done) => {
      try {
        const normalizedEmail = String(email).trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
          return done(null, false, { message: "User does not exist" });
        }

        if (user.isDeleted) {
          return done(null, false, { message: "User is deleted" });
        }

        if (user.isActive && user.isActive !== IsActive.ACTIVE) {
          return done(null, false, { message: "Account is not active" });
        }

        const hasGoogle = user.auths?.some(p => p.provider === "google");
        const hasCreds  = user.auths?.some(p => p.provider === "credentials");

        // If signed up with Google and never set a password
        if (hasGoogle && !hasCreds && !user.password) {
          return done(null, false, {
            message:
              "You signed up with Google. Login with Google, then set a password to enable email/password login.",
          });
        }

        if (!user.password) {
          return done(null, false, { message: "No password set for this account" });
        }

        const ok = await verifyPassword(password, user.password);
        if (!ok) {
          return done(null, false, { message: "Password does not match" });
        }

        return done(null, user);
      } catch (err) {
        console.log("LocalStrategy error:", err);
        return done(err);
      }
    }
  )
);

// ---------- Google OAuth ----------
passport.use(
  new GoogleStrategy(
    {
      clientID: envVars.GOOGLE_CLIENT_ID,
      clientSecret: envVars.GOOGLE_CLIENT_SECRET,
      callbackURL: envVars.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        if (!email) {
          return done(null, false, { message: "No email found" });
        }

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            email,
            name: profile.displayName,
            picture: profile.photos?.[0]?.value,
            role: Role.ADMIN,
            isVerified: true,
            auths: [{ provider: "google", providerId: profile.id }],
          });
        } else {
          // Ensure google provider is recorded (idempotent)
          const hasGoogle = user.auths?.some(p => p.provider === "google");
          if (!hasGoogle) {
            user.auths = [...(user.auths || []), { provider: "google", providerId: profile.id }];
            await user.save();
          }
        }

        return done(null, user);
      } catch (error) {
        console.log("Google Strategy Error:", error);
        return done(error);
      }
    }
  )
);

// ---------- Session plumbing ----------
passport.serializeUser((user: any, done: (err: any, id?: unknown) => void) => {
  done(null, user._id);
});

passport.deserializeUser(async (id: string, done: any) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    console.log("deserializeUser error:", error);
    done(error);
  }
});

export default passport;
