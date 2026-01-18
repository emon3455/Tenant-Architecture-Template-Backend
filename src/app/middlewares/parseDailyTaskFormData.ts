// src/middlewares/parseFormData.ts
import { NextFunction, Request, Response } from "express";

/**
 * Middleware to parse FormData and ensure text fields are properly extracted
 * when using multer for file uploads.
 */
export const parseDailyTasksFormData = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body) {
        // Parse JSON fields that might be stringified
        const jsonFields = ['recurrence'];
        
        for (const field of jsonFields) {
          if (req.body[field] && typeof req.body[field] === 'string') {
            try {
              req.body[field] = JSON.parse(req.body[field]);
            } catch (e) {
              // Keep as string if not valid JSON
            }
          }
        }

        // Convert string booleans to actual booleans
        const booleanFields = ['isRecurring', 'isPublic'];
        for (const field of booleanFields) {
          if (req.body[field] !== undefined) {
            req.body[field] = req.body[field] === 'true' || req.body[field] === true;
          }
        }

        // Handle recurrence nested fields
        if (req.body.recurrence) {
          // Convert interval to number
          if (req.body.recurrence.interval !== undefined) {
            req.body.recurrence.interval = Number(req.body.recurrence.interval);
          }

          // Convert daysOfWeek strings to numbers
          if (req.body.recurrence.daysOfWeek) {
            if (typeof req.body.recurrence.daysOfWeek === 'string') {
              try {
                req.body.recurrence.daysOfWeek = JSON.parse(req.body.recurrence.daysOfWeek);
              } catch (e) {
                req.body.recurrence.daysOfWeek = [];
              }
            }
            if (Array.isArray(req.body.recurrence.daysOfWeek)) {
              req.body.recurrence.daysOfWeek = req.body.recurrence.daysOfWeek.map(Number);
            }
          }

          // Convert occurrences to number
          if (req.body.recurrence.occurrences !== undefined) {
            req.body.recurrence.occurrences = Number(req.body.recurrence.occurrences);
          }
        }

        // Parse existingAttachments if it's a string (for updates)
        if (req.body.existingAttachments && typeof req.body.existingAttachments === 'string') {
          try {
            req.body.existingAttachments = JSON.parse(req.body.existingAttachments);
          } catch (e) {
            req.body.existingAttachments = [];
          }
        }
      }
      
      next();
    } catch (error) {
      console.error('parseFormData middleware error:', error);
      next(error);
    }
  };
};