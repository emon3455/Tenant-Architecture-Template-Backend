import { NextFunction, Request, Response } from "express";

export const parseFormDataArrays = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const field of fields) {
      if (req.body[field] && typeof req.body[field] === 'string') {
        try {
          req.body[field] = JSON.parse(req.body[field]);
        } catch (e) {
          console.log(e)
        }
      }
    }
    next();
  };
};