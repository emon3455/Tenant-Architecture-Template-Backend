import { NextFunction, Request, Response } from "express";

export const mergeFormData = (req: Request, res: Response, next: NextFunction) => {
  const files = req.files as Record<string, Express.Multer.File[]>;

  const normalizeToArray = (input: any) => (input ? (Array.isArray(input) ? input : [input]) : []);

  const protocolHost = `${req.protocol}://${req.get("host")}`;

  // Flatten segment fields for service
  const segment_title_en = req.body.segment_title_en || undefined;
  const segment_description_en = req.body.segment_description_en || undefined;
  const segment_title_es = req.body.segment_title_es || undefined;
  const segment_description_es = req.body.segment_description_es || undefined;

  // Normalize video text fields
  const video_title_en = normalizeToArray(req.body.video_title_en);
  const video_description_en = normalizeToArray(req.body.video_description_en);
  const video_link_en = normalizeToArray(req.body.video_link_en);

  const video_title_es = normalizeToArray(req.body.video_title_es);
  const video_description_es = normalizeToArray(req.body.video_description_es);
  const video_link_es = normalizeToArray(req.body.video_link_es);

  const video_role = normalizeToArray(req.body.video_role);

  // Flatten file objects
  const segment_thumbnail_en = files.segment_thumbnail_en || [];
  const segment_thumbnail_es = files.segment_thumbnail_es || [];
  const video_en = files.video_en || [];
  const video_es = files.video_es || [];
  const video_thumbnail_en = files.video_thumbnail_en || [];
  const video_thumbnail_es = files.video_thumbnail_es || [];

  // Build en_option / es_option for Zod validation
  const en_option = {
    title: segment_title_en,
    description: segment_description_en,
    thumbnail: segment_thumbnail_en[0] ? `${protocolHost}/uploads/videos/${segment_thumbnail_en[0].filename}` : undefined,
    videoFile: video_en.map(f => ({
      filename: f.filename,
      mimetype: f.mimetype,
      size: f.size,
      path: f.path,
    })),
  };

  const es_option = {
    title: segment_title_es,
    description: segment_description_es,
    thumbnail: segment_thumbnail_es[0] ? `${protocolHost}/uploads/videos/${segment_thumbnail_es[0].filename}` : undefined,
    videoFile: video_es.map(f => ({
      filename: f.filename,
      mimetype: f.mimetype,
      size: f.size,
      path: f.path,
    })),
  };

  // console.log("req ff = ",req.body)
  // console.log("req org id = ", req?.orgId)
  req.orgId = req.body.orgId || String(req?.orgId);
  // console.log("ooo = ",req.body.orgId || String(req?.orgId))

  // Merge everything into req.body
  req.body = {
    ...req.body,
    org: String(req?.orgId),

    segment_title_en,
    segment_description_en,
    segment_title_es,
    segment_description_es,

    video_title_en,
    video_description_en,
    video_link_en,
    video_title_es,
    video_description_es,
    video_link_es,
    video_role,

    segment_thumbnail_en,
    segment_thumbnail_es,
    video_en,
    video_es,
    video_thumbnail_en,
    video_thumbnail_es,

    en_option,
    es_option,
  };

  next();
};


export const trainingSegemntCategoryUpdate = (req: Request, res: Response, next: NextFunction) => {
  const files = req.files as Record<string, Express.Multer.File[]>;

  // Helper to convert empty strings to undefined
  const normalize = (val: any) => (val === "" ? undefined : val);

  req.body = {
    ...req.body,
    segment_title_en: normalize(req.body.segment_title_en),
    segment_description_en: normalize(req.body.segment_description_en),
    segment_title_es: normalize(req.body.segment_title_es),
    segment_description_es: normalize(req.body.segment_description_es),
    segment_thumbnail_en: files.segment_thumbnail_en?.[0], // optional
  };

  next();
};


export const updateVideoMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const files = req.files as Record<string, Express.Multer.File[]>;

  const protocolHost = `${req.protocol}://${req.get("host")}`;

  console.log(files)

  // Convert "" → undefined
  const normalize = (val: any) => {
    if (val === "" || val === undefined || val === null) return undefined;
    return val;
  };

  // Convert values into arrays safely
  const normalizeArray = (val: any) => {
    if (!val) return [];

    // If JSON encoded array: ["A","B"]
    if (typeof val === "string" && val.startsWith("[") && val.endsWith("]")) {
      try {
        return JSON.parse(val);
      } catch {
        return [val];
      }
    }

    // Already array
    if (Array.isArray(val)) return val;

    // Single string → array
    return [val];
  };

  // Extract text fields
  const video_title_en = normalize(req.body.video_title_en);
  const video_description_en = normalize(req.body.video_description_en);
  const video_title_es = normalize(req.body.video_title_es);
  const video_description_es = normalize(req.body.video_description_es);

  const video_role = normalizeArray(req.body.video_role);

  // Extract file fields
  const video_thumbnail_en = files.video_thumbnail_en || [];
  const video_thumbnail_es = files.video_thumbnail_es || [];
  const video_en = files.video_en || [];
  const video_es = files.video_es || [];

  // Build en_option
  const en_option = {
    title: video_title_en,
    description: video_description_en,
    thumbnail: video_thumbnail_en[0]
      ? `${protocolHost}/uploads/videos/${video_thumbnail_en[0].filename}`
      : undefined,
    videoFile: video_en.map((f) => ({
      filename: f.filename,
      mimetype: f.mimetype,
      size: f.size,
      path: f.path,
    })),
  };

  // Build es_option
  const es_option = {
    title: video_title_es,
    description: video_description_es,
    thumbnail: video_thumbnail_es[0]
      ? `${protocolHost}/uploads/videos/${video_thumbnail_es[0].filename}`
      : undefined,
    videoFile: video_es.map((f) => ({
      filename: f.filename,
      mimetype: f.mimetype,
      size: f.size,
      path: f.path,
    })),
  };

  // Final merged body
  req.body = {
    ...req.body,
    org: String(req?.orgId),

    video_title_en,
    video_description_en,
    video_title_es,
    video_description_es,

    video_role,

    video_thumbnail_en,
    video_thumbnail_es,
    video_en,
    video_es,

    en_option,
    es_option,
  };
  // console.log(req.body)

  next();
};




// Middleware to merge video form data: handles files or links
export const mergeVideoFormDataWithLinks = (req: Request, res: Response, next: NextFunction) => {
  const files = req.files as Record<string, Express.Multer.File[]>;

  // Convert empty strings to undefined
  const normalize = (val: any) => (val === "" ? undefined : val);

  // Parse JSON string for roles if sent as string
  let video_role: string[] = [];
  if (req.body.video_role) {
    try {
      video_role = typeof req.body.video_role === "string" ? JSON.parse(req.body.video_role) : req.body.video_role;
      if (!Array.isArray(video_role)) video_role = [];
    } catch (err) {
      video_role = [];
    }
  }

  // Normalize video fields: file or link
  const video_en = files.video_en?.[0] || normalize(req.body.video_link_en);
  const video_es = files.video_es?.[0] || normalize(req.body.video_link_es);

  req.body = {
    ...req.body,
    video_title_en: normalize(req.body.video_title_en),
    video_description_en: normalize(req.body.video_description_en),
    video_title_es: normalize(req.body.video_title_es),
    video_description_es: normalize(req.body.video_description_es),
    video_role, // array of roles

    video_en,  // file or link
    video_es,  // file or link

    // Keep original link fields in body
    video_link_en: normalize(req.body.video_link_en),
    video_link_es: normalize(req.body.video_link_es),

    video_thumbnail_en: files.video_thumbnail_en?.[0] || undefined,
    video_thumbnail_es: files.video_thumbnail_es?.[0] || undefined,
  };

  next();
};
