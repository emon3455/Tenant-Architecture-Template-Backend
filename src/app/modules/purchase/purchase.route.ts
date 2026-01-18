import { Router } from "express";
import { purchaseController } from "./purchase.controller";

const router = Router();

router.post("/", purchaseController.purchase);

router.post("/change-plan", purchaseController.changePlan);

export const PurchaseRoutes = router;
