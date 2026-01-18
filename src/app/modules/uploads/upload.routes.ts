import { Router } from "express";
import { UploadControllers } from "./upload.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import upload from "../../config/multer";

const router = Router();


router.post(
  "/single",
  checkAuth(),
  upload.single("file"),
  UploadControllers.singleUpload
);

router.post(
  "/multiple",
  checkAuth(),
  upload.array("files", 10),
  UploadControllers.multipleUpload
);

router.delete(
  "/multiple",
  checkAuth(),
  UploadControllers.deleteMultipleFiles
);

router.delete(
  "/:id",
  checkAuth(),
  UploadControllers.deleteFile
);

router.get(
  "/all",
  checkAuth(),
  UploadControllers.getAllFiles
);

router.get(
  "/org/:orgId",
  checkAuth(),
  UploadControllers.getFilesByOrg
);

export const UploadRoutes = router;
