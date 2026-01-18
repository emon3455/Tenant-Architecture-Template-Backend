import express from "express";
import { ContactController } from "./contact.controller";
import { ContactValidation } from "./contact.validation";
import { validateRequest } from "../../middlewares/validateRequest";
import { checkAuth } from "../../middlewares/checkAuth";

const router = express.Router();

/**
 * @route   POST /api/contacts
 * @desc    Create a new contact
 * @access  Private
 */
router.post(
  "/",
  checkAuth(),
  validateRequest(ContactValidation.createContactSchema),
  ContactController.create
);

/**
 * @route   GET /api/contacts
 * @desc    Get all contacts for the organization
 * @access  Private
 */
router.get("/", checkAuth(), ContactController.getAll);

/**
 * @route   GET /api/contacts/:id
 * @desc    Get a single contact by ID
 * @access  Private
 */
router.get("/:id", checkAuth(), ContactController.getSingle);

/**
 * @route   PUT /api/contacts/:id
 * @desc    Update a contact
 * @access  Private
 */
router.put(
  "/:id",
  checkAuth(),
  validateRequest(ContactValidation.updateContactSchema),
  ContactController.update
);

/**
 * @route   DELETE /api/contacts/:id
 * @desc    Soft delete a contact
 * @access  Private
 */
router.delete("/:id", checkAuth(), ContactController.softDelete);

router.get(
  "/tags/all",
  checkAuth(),
  ContactController.getAllTags
);

router.post(
  "/tags/count-by",
  checkAuth(),
  validateRequest(ContactValidation.getUsersCountByTagsSchema),
  ContactController.getUsersCountByTags
);

export const ContactRoutes = router;
