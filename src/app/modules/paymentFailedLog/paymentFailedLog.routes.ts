import { Router } from "express";
import * as PaymentFailedLogController from "./paymentFailedLog.controller";
import { checkAuth } from "../../middlewares/checkAuth";

const router = Router();

/**
 * @route   GET /api/payment-failed-logs/stats
 * @desc    Get payment failed log statistics
 * @access  Private (Admin, Super Admin)
 */
router.get(
  "/stats",
  checkAuth("ADMIN", "SUPER_ADMIN"),
  PaymentFailedLogController.getPaymentFailedLogStats
);

/**
 * @route   POST /api/payment-failed-logs
 * @desc    Create a new payment failed log
 * @access  Private (System, Admin, Super Admin)
 */
router.post(
  "/",
  checkAuth("ADMIN", "SUPER_ADMIN"),
  PaymentFailedLogController.createPaymentFailedLog
);

/**
 * @route   GET /api/payment-failed-logs
 * @desc    Get all payment failed logs with filtering
 * @access  Private (Admin, Super Admin)
 */
router.get(
  "/",
  checkAuth("ADMIN", "SUPER_ADMIN"),
  PaymentFailedLogController.getPaymentFailedLogs
);

/**
 * @route   GET /api/payment-failed-logs/:id
 * @desc    Get a single payment failed log by ID
 * @access  Private (Admin, Super Admin)
 */
router.get(
  "/:id",
  checkAuth("ADMIN", "SUPER_ADMIN"),
  PaymentFailedLogController.getPaymentFailedLogById
);

/**
 * @route   PATCH /api/payment-failed-logs/:id
 * @desc    Update a payment failed log
 * @access  Private (Admin, Super Admin)
 */
router.patch(
  "/:id",
  checkAuth("ADMIN", "SUPER_ADMIN"),
  PaymentFailedLogController.updatePaymentFailedLog
);

/**
 * @route   DELETE /api/payment-failed-logs/:id
 * @desc    Delete a payment failed log
 * @access  Private (Super Admin)
 */
router.delete(
  "/:id",
  checkAuth("SUPER_ADMIN"),
  PaymentFailedLogController.deletePaymentFailedLog
);

export const PaymentFailedLogRoutes = router;
