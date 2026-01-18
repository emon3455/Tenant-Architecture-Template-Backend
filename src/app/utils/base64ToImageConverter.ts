import fs from "fs/promises";
import path from "path";
import { production } from "../constant/constant";
import { envVars } from "../config/env";

export async function extractAndReplaceBase64Images(htmlContent: string): Promise<string> {
    const base64Regex = /<img[^>]+src=["'](data:image\/[^;]+;base64,[^"']+)["'][^>]*>/gi;
    let match: RegExpExecArray | null;
    let index = 0;

    while ((match = base64Regex.exec(htmlContent)) !== null) {
        const base64Data = match[1];
        const extMatch = base64Data.match(/^data:image\/(\w+);base64,/);
        if (!extMatch) continue;

        const ext = extMatch[1];
        const base64Str = base64Data.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Str, "base64");

        // Generate unique filename
        const filename = `img_${Date.now()}_${index++}.${ext}`;
        const filePath = path.join(__dirname, "../../../uploads", filename);

        // Determine file URL
        const fileUrl = `${envVars.BACKEND_URL}/uploads/${filename}`;

        // Save image asynchronously
        await fs.writeFile(filePath, buffer);

        // Replace base64 string with file URL
        htmlContent = htmlContent.replace(base64Data, fileUrl);
    }

    return htmlContent;
}
