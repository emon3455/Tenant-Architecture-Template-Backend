import { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { PaymentControllers } from "./payment.controller";
import { createPaymentZodSchema, updatePaymentZodSchema } from "./payment.validation";
import { checkAuth } from "../../middlewares/checkAuth";

const router = Router();

router.post(
  "/",
  checkAuth(),
  validateRequest(createPaymentZodSchema),
  PaymentControllers.createPayment
);

router.get(
  "/all",
  checkAuth(),
  PaymentControllers.getAllPayments
);

router.get(
  "/download/:id",
  checkAuth(),
  PaymentControllers.downloadPaymentInvoice
);

router.get(
  "/org/:orgId",
  checkAuth(),
  PaymentControllers.getPaymentsByOrgId
);

router.get(
  "/:id",
  checkAuth(),
  PaymentControllers.getPaymentById
);

router.patch(
  "/:id",
  checkAuth(),
  validateRequest(updatePaymentZodSchema),
  PaymentControllers.updatePayment
);

router.delete(
  "/:id",
  checkAuth(),
  PaymentControllers.deletePayment
);

export const PaymentRoutes = router;
