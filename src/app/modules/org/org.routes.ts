import { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { checkAuth } from "../../middlewares/checkAuth";
import { OrgControllers } from "./org.controller";
import {
  createOrgZodSchema,
  updateOrgZodSchema,
  updateBillingInfoZodSchema,
} from "./org.validation";

const router = Router();

// Public reads (adjust if you want to restrict)
router.get("/", OrgControllers.getAllOrgs);
router.get("/:id", OrgControllers.getOrgById);

// Protected writes
router.post("/", validateRequest(createOrgZodSchema), OrgControllers.createOrg);


// update billing info
router.patch(
  "/update-billing-info",
  checkAuth(),
  validateRequest(updateBillingInfoZodSchema),
  OrgControllers.updateBillingInfo
);

// router.patch(
//   "/update-date",
//   checkAuth(),
//   validateRequest(updateBillingDatesZodSchema), // Add validation if you have it
//   OrgControllers.updateBillingDates
// );

// update org - only ADMIN and SUPER_ADMIN
router.patch(
  "/:id",
  checkAuth(),
  validateRequest(updateOrgZodSchema),
  OrgControllers.updateOrg
);

// delete org - only ADMIN and SUPER_ADMIN
router.delete(
  "/:id",
  checkAuth(),
  OrgControllers.deleteOrg
);

export const OrgRoutes = router;
