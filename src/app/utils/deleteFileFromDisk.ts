import { JwtPayload } from "jsonwebtoken";
import { Upload } from "../modules/uploads/upload.model";
import path from "path";
import fs from "fs";
import { LogControllers } from "../modules/log/log.controller";

// Helper to delete file from disk
export const deleteFileFromDisk = async (
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