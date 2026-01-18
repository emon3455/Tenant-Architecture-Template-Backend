import { NextFunction, Request, Response } from "express";

/**
 * Middleware to parse FormData and ensure text fields are properly extracted
 * when using multer for file uploads.
 *
 * This middleware should be used after multer middleware to ensure that
 * text fields from multipart/form-data requests are properly parsed and
 * available in req.body for validation.
 */
export const parseFormData = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Debug: Log what we're receiving
      // console.log('=== parseFormData middleware ===');
      // console.log('req.method:', req.method);
      // console.log('req.path:', req.path);
      // console.log('req.headers[content-type]:', req.headers['content-type']);
      // console.log('req.body:', req.body);
      // console.log('req.files:', req.files);

      // Check if this is a multipart/form-data request (multer has processed it)
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        // Ensure text fields are properly extracted from FormData
        // Multer should have already parsed these, but we'll ensure they exist
        const subject = req.body.subject || '';
        const description = req.body.description || '';
        const category = req.body.category || null;

        // Reconstruct the request body with proper structure
        req.body = {
          subject,
          description,
          category,
          // Preserve any other fields that might have been parsed
          ...req.body
        };

        // console.log('Reconstructed req.body:', req.body);
      } else {
        // console.log('No files uploaded, using original req.body');
      }
      next();
    } catch (error) {
      // console.error('parseFormData middleware error:', error);
      next(error);
    }
  };
};