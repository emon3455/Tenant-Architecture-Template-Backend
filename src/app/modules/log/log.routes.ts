import express, { Router } from "express"; // ← Add express import
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { LogControllers } from "./log.controller";
import { createLogZodSchema } from "./log.validation";

const router = Router();

// Add body parser to this specific router
router.use(express.json()); // ← Now this works

// router.post(
//   "/",
//   checkAuth(),
//   validateRequest(createLogZodSchema),
//   LogControllers.addLog
// );

router.get(
  "/",
  checkAuth(),
  LogControllers.getLogs
);

router.get(
  "/actions",
  checkAuth(),
  LogControllers.getAllActionTypes
);

router.post("/test", (req, res) => {
  console.log("Test route body:", req.body);
  res.json({ 
    success: true, 
    body: req.body,
    bodyType: typeof req.body
  });
});

export const LogRoutes = router;