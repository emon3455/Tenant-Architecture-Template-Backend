import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { EmailTemplateController } from "./emailTemplate.controller";
import {
  createCategorySchema,
  createTemplateSchema,
  updateCategorySchema,
  updateTemplateSchema,
  testSendTemplateSchema,
} from "./emailTemplate.validation";

const router = Router();

// ✅ Categories (must come first)
router.post("/categories", checkAuth(), validateRequest(createCategorySchema), EmailTemplateController.createCategory);
router.get("/categories", checkAuth(), EmailTemplateController.getCategories);
router.put("/categories/:id", checkAuth(), validateRequest(updateCategorySchema), EmailTemplateController.updateCategory);
router.delete("/categories/:id", checkAuth(), EmailTemplateController.deleteCategory);

// ✅ Templates
router.post("/", checkAuth(), validateRequest(createTemplateSchema), EmailTemplateController.createTemplate);
router.get("/", checkAuth(), EmailTemplateController.getTemplates);
router.get("/:id", checkAuth(), EmailTemplateController.getTemplateById);
router.put("/:id", checkAuth(), validateRequest(updateTemplateSchema), EmailTemplateController.updateTemplate);
router.delete("/:id", checkAuth(), EmailTemplateController.deleteTemplate);

// ✅ Test send using a template
router.post(
  "/:id/test-send",
  checkAuth(),
  validateRequest(testSendTemplateSchema),
  EmailTemplateController.testSendTemplate
);

export default router;
