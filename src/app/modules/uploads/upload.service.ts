import { LogControllers } from "../log/log.controller";
import { JwtPayload } from "jsonwebtoken";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { IUpload } from "./upload.interface";
import { Upload } from "./upload.model";
import fs from "fs";
import path from "path";
import { QueryBuilder } from "../../utils/QueryBuilder";

const saveFile = async (
  file: Express.Multer.File,
  baseUrl: string,
  orgId: string,
  userId: string
) => {
  const fileUrl = `${baseUrl}/uploads/${file.filename}`;

  const uploadData: IUpload = {
    filename: file.filename,
    url: fileUrl,
    mimetype: file.mimetype,
    size: file.size,
    org: orgId as any,
    uploadedBy: userId as any,
  };

  const savedFile = await Upload.create(uploadData);
  return savedFile;
};

const singleUpload = async (
  file: Express.Multer.File,
  baseUrl: string,
  orgId: string,
  userId: string,
  logActor?: JwtPayload
) => {
  if (!file) throw new Error("No file uploaded");
  const savedFile = await saveFile(file, baseUrl, orgId, userId);
  // Log file upload
  if (logActor) {
    try {
      const actor = logActor as any;
      const actorDisplay =
        actor?.name || actor?.email || actor?.userId || "system";
      await LogControllers.addLog(
        "File Uploaded",
        actor?.userId ||
          (savedFile as any)?.uploadedBy?.toString?.() ||
          "unknown",
        `File uploaded: ${file?.originalname || file?.filename} (
        type=${file?.mimetype}, size=${file?.size} bytes)`,
        logActor
      );
    } catch (e) {
      console.error("Failed to log file upload:", e);
    }
  }
  return savedFile;
};

const multipleUpload = async (
  files: Express.Multer.File[],
  baseUrl: string,
  orgId: string,
  userId: string,
  logActor?: JwtPayload
) => {
  if (!files || files.length === 0) throw new Error("No files uploaded");
  const savedFiles = await Promise.all(
    files.map((file) => saveFile(file, baseUrl, orgId, userId))
  );
  // Log multiple file upload
  if (logActor) {
    try {
      const actor = logActor as any;
      const actorDisplay =
        actor?.name || actor?.email || actor?.userId || "system";
      const names = (files || []).map((f) => f.originalname || f.filename);
      const ids = ((savedFiles as any[]) || [])
        .map((r: any) => r?._id?.toString?.())
        .filter(Boolean);
      await LogControllers.addLog(
        "Files Uploaded",
        actor?.userId || "unknown",
        `Files uploaded: count=${files?.length || 0}; names=[${names.join(
          ", "
        )}];`,
        logActor
      );
    } catch (e) {
      console.error("Failed to log multiple file upload:", e);
    }
  }
  return savedFiles;
};

const deleteFile = async (
  fileId: string,
  orgId: string,
  logActor?: JwtPayload
) => {
  const fileDoc = await Upload.findOne({ _id: fileId, org: orgId });
  if (!fileDoc) {
    throw new Error("File not found or not authorized");
  }

  // Delete from disk
  const filePath = path.join(process.cwd(), "uploads", fileDoc.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Delete from DB
  await Upload.findByIdAndDelete(fileId);

  // Log file deletion
  if (logActor) {
    try {
      const actor = logActor as any;
      const actorDisplay =
        actor?.name || actor?.email || actor?.userId || "system";
      await LogControllers.addLog(
        "File Deleted",
        actor?.userId || "unknown",
        `File deleted: id=${__filename} by ${actor?.email || actor?.userId}`,
        logActor
      );
    } catch (e) {
      console.error("Failed to log file deletion:", e);
    }
  }
  return { message: "File deleted successfully" };
};
const getAllFiles = async (orgId: string, query: Record<string, string>) => {
  const searchableFields = ["filename", "mimetype"];
  const qb = new QueryBuilder(Upload.find({ org: orgId }), query)
    .filter()
    .search(searchableFields)
    .sort()
    .fields()
    .paginate();
  const files = await qb.build();
  const meta = await qb.getMeta();
  return { meta, data: files };
};

const deleteMultipleFiles = async (
  fileIds: string[],
  orgId: string,
  logActor?: JwtPayload
) => {
  const files = await Upload.find({ _id: { $in: fileIds }, org: orgId });
  for (const file of files) {
    const filePath = path.join(process.cwd(), "uploads", file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
  await Upload.deleteMany({ _id: { $in: fileIds }, org: orgId });
  // Log multiple file deletion
  if (logActor) {
    try {
      const actor = logActor as any;
      const actorDisplay =
        actor?.name || actor?.email || actor?.userId || "system";
      await LogControllers.addLog(
        "Files Deleted",
        actor?.userId || "unknown",
        `Files deleted: count=${(fileIds || []).length}; 
        by ${actor?.email}`,
        logActor
      );
    } catch (e) {
      console.error("Failed to log multiple file deletion:", e);
    }
  }
  return { message: `${files.length} files deleted successfully` };
};

export const UploadServices = {
  singleUpload,
  multipleUpload,
  deleteFile,
  getAllFiles,
  deleteMultipleFiles,
};
