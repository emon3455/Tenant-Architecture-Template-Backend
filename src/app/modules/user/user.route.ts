import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { UserControllers } from "./user.controller";
// import { Role } from "./user.interface";
import { createUserSupportAgentZodSchema, createUserZodSchema, setFeatureAccessZod, updateUserZodSchema } from "./user.validation";

const router = Router();

router.get("/me", checkAuth(), UserControllers.getMe);
router.post(
  "/register",
  validateRequest(createUserZodSchema),
  UserControllers.createUser
);
router.post(
  "/create-support-agent",
  validateRequest(createUserSupportAgentZodSchema),
  UserControllers.createSupportAgent
);
router.get(
  "/all-users",
  checkAuth(),
  UserControllers.getAllUsers
);

router.patch(
  "/update-me",
  checkAuth(),
  UserControllers.updateMe
);

router.get(
  "/availability/status",
  checkAuth(),
  UserControllers.getUsersTasks
);

router.patch(
  "/:id",
  validateRequest(updateUserZodSchema),
  checkAuth(),
  UserControllers.updateUser
);

//get support agents
router.get(
  "/support-agents",
  checkAuth(),
  UserControllers.getAllSupportAgents
);

router.patch(
  "/approve-reject/:id",
  checkAuth(),
  UserControllers.approveRejectUser
);

router.patch(
  "/set-feature-access/:id",
  checkAuth(),
  validateRequest(setFeatureAccessZod),
  UserControllers.setFeatureAccess
);

// For any logged-in user to see their own featureAccess
router.get(
  "/feature/:id",
  checkAuth(),
  UserControllers.getFeatureAccess
);

router.get(
  "/:id",
  checkAuth(),
  UserControllers.getUserById
);




export const UserRoutes = router;
