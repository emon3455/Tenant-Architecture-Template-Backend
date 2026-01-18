import { NextFunction, Request, Response, Router } from "express";
import passport from "passport";
import { checkAuth } from "../../middlewares/checkAuth";
import { AuthControllers } from "./auth.controller";

const router = Router()

router.post("/login", AuthControllers.credentialsLogin)
router.post("/login-by-email-role", AuthControllers.loginByEmailAndRole)
router.post("/refresh-token", AuthControllers.getNewAccessToken)
router.post("/logout", AuthControllers.logout)
router.post("/change-password", checkAuth(), AuthControllers.changePassword)
router.post("/set-password", checkAuth(), AuthControllers.setPassword)
router.post("/forgot-password", AuthControllers.forgotPassword);
// NEW: verify OTP and mint a short-lived reset token
router.post("/verify-reset-otp", AuthControllers.verifyResetOtp);
// UPDATED: reset password now uses the reset token (no email/otp)
router.post("/reset-password", AuthControllers.resetPassword);

router.get("/google", async (req: Request, res: Response, next: NextFunction) => {
    const redirect = req.query.redirect || "/"
    passport.authenticate("google", { scope: ["profile", "email"], state: redirect as string })(req, res, next)
})

router.get("/google/callback", passport.authenticate("google", { failureRedirect: "/login" }), AuthControllers.googleCallbackController)

export const AuthRoutes = router;