import { NextFunction, Request, Response } from "express"
import { AnyZodObject, ZodEffects } from "zod"

export const validateRequest = (zodSchema: AnyZodObject | ZodEffects<any>) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        req.body = await zodSchema.parseAsync(req.body)
        next()
    } catch (error) {
        next(error)
    }
}