import { Router } from "express";
import { OrgSettingsControllers } from "./orgSettings.controller";
import { upsertOrgSettingsZ } from "./orgSettings.validation";
import { validateRequest } from "../../middlewares/validateRequest";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";

const router = Router();

// 🔹 My settings (self-org) - Any authenticated user can access their own org settings
router.get("/my-setting", checkAuth(), OrgSettingsControllers.getMyOrgSettings);
router.post(
  "/create-my-setting",
  validateRequest(upsertOrgSettingsZ),
  checkAuth(),
  OrgSettingsControllers.upsertMyOrgSettings
);
router.patch(
  "/update-my-setting",
  validateRequest(upsertOrgSettingsZ.partial()),
  checkAuth(),
  OrgSettingsControllers.upsertMyOrgSettings
);

// 🔹 Admin / org-based
router.get("/all", checkAuth(), OrgSettingsControllers.getAllOrgSettings);
router.get("/setting/:orgId", checkAuth(), OrgSettingsControllers.getOrgSettingsByOrgId);
router.post(
  "/create-setting",
  validateRequest(upsertOrgSettingsZ),
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  OrgSettingsControllers.createOrgSettings
);
router.delete("/delete/:orgId", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), OrgSettingsControllers.deleteOrgSettings);

export const OrgSettingsRoutes = router;