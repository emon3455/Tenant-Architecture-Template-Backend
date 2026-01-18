import { NextFunction, Request, Response } from "express";

export const mergeVideoFormData = (req: Request, res: Response, next: NextFunction) => {
  const files = req.files as Record<string, Express.Multer.File[]>;

  const normalizeToArray = (input: any) => {
    if (!input) return [];
    if (typeof input === "string") {
      return input.includes(",") ? input.split(",").map((s) => s.trim()) : [input];
    }
    return Array.isArray(input) ? input : [input];
  };

  // -------------------- Text fields --------------------
  const video_title_en = normalizeToArray(req.body.video_title_en);
  const video_description_en = normalizeToArray(req.body.video_description_en);
  const video_link_en = normalizeToArray(req.body.video_link_en);

  const video_title_es = normalizeToArray(req.body.video_title_es);
  const video_description_es = normalizeToArray(req.body.video_description_es);
  const video_link_es = normalizeToArray(req.body.video_link_es);

  const video_role = normalizeToArray(req.body.video_role);

  // -------------------- File fields --------------------
  const video_en = files.video_en || [];
  const video_es = files.video_es || [];
  const video_thumbnail_en = files.video_thumbnail_en || [];
  const video_thumbnail_es = files.video_thumbnail_es || [];

  // -------------------- Merge into req.body --------------------
  req.body = {
    ...req.body,
    org: String(req?.orgId),

    video_title_en,
    video_description_en,
    video_link_en,

    video_title_es,
    video_description_es,
    video_link_es,

    video_role,

    video_en,
    video_es,
    video_thumbnail_en,
    video_thumbnail_es,
  };

  next();
};
