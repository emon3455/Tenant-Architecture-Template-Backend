import z from "zod";
import { 
  createLogZodSchema, 
  logQueryZodSchema 
} from "./log.interface";

export {
  createLogZodSchema,
  logQueryZodSchema
};

// No middleware functions needed - using centralized validateRequest