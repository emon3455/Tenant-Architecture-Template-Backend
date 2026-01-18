import { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { checkAuth } from "../../middlewares/checkAuth";
import { PlanControllers } from "./plan.controller";
import { createPlanZodSchema, updatePlanZodSchema } from "./plan.validation";
import { Role } from "../user/user.interface";

const router = Router();


router.get("/", PlanControllers.getAllPlans);
router.get("/slug/:slug", PlanControllers.getPlanBySlug);
router.get("/:id", PlanControllers.getPlanById);

// Protected writes
router.post(
  "/",
  checkAuth(),
  validateRequest(createPlanZodSchema),
  PlanControllers.createPlan
);

router.patch(
  "/:id",
  checkAuth(),
  validateRequest(updatePlanZodSchema),
  PlanControllers.updatePlan
);

router.delete(
  "/:id",
  checkAuth(),
  PlanControllers.deletePlan
);

export const PlanRoutes = router;
