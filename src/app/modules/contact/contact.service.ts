import httpStatus from "http-status-codes";
import mongoose from "mongoose";
import { JwtPayload } from "jsonwebtoken";
import AppError from "../../errorHelpers/AppError";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { IGenericResponse } from "../../interfaces/common";
import { Contact } from "./contact.model";
import { IContact, IContactCreate, IContactUpdate } from "./contact.interface";

const searchableFields = ["firstName", "lastName", "email", "phone", "contactType"];

/**
 * CREATE: Create a new contact
 */
export const create = async (
  payload: IContactCreate,
  orgId: string,
  userId: string,
  logActor?: JwtPayload
): Promise<IContact> => {
  // Validate that at least email or phone is provided
  if (!payload.email && !payload.phone) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Either email or phone must be provided"
    );
  }

  // Check for duplicate email in organization
  if (payload.email) {
    const existingEmailContact = await Contact.findOne({
      org: orgId,
      email: payload.email,
      isActive: true,
    });

    if (existingEmailContact) {
      throw new AppError(
        httpStatus.CONFLICT,
        `Contact with email '${payload.email}' already exists in this organization`
      );
    }
  }

  // Check for duplicate phone in organization
  if (payload.phone) {
    const existingPhoneContact = await Contact.findOne({
      org: orgId,
      phone: payload.phone,
      isActive: true,
    });

    if (existingPhoneContact) {
      throw new AppError(
        httpStatus.CONFLICT,
        `Contact with phone '${payload.phone}' already exists in this organization`
      );
    }
  }

  const contactData = {
    ...payload,
    org: new mongoose.Types.ObjectId(orgId),
    createdBy: new mongoose.Types.ObjectId(userId),
  };

  const contact = await Contact.create(contactData);

  // Log contact creation
  if (logActor) {
    try {
      const actor = logActor;
      const identifier = contact.email || contact.phone || "Unknown";
      await (
        await import("../log/log.controller")
      ).LogControllers.addLog(
        "Contact Created",
        userId,
        `Contact ${identifier} created by ${actor?.email || actor?.userId}. Name: ${contact.name || ""}`,
        logActor
      );
    } catch (e) {
      console.error("Failed to log contact creation:", e);
    }
  }

  return contact;
};

/**
 * GET ALL: Get all contacts for an organization with search and pagination
 * Tenant filtering is handled automatically by tenantScopePlugin
 */
export const getAll = async (
  query: Record<string, any>
): Promise<IGenericResponse<IContact[]>> => {
  const modifiedQuery = { ...query };

  // Base query - tenant plugin will automatically filter by org for non-super-admin users
  const baseQuery = Contact.find({ isActive: true }).populate("org", "orgName");

  const queryBuilder = new QueryBuilder(baseQuery, modifiedQuery)
    .filter()
    .search(searchableFields)
    .sort()
    .fields()
    .paginate();

  const contacts = await queryBuilder.build();
  const meta = await queryBuilder.getMeta();

  return { data: contacts, meta };
};

/**
 * GET SINGLE: Get a single contact by ID
 * Tenant filtering is handled automatically by tenantScopePlugin
 */
export const getSingle = async (
  id: string
): Promise<IContact> => {
  const contact = await Contact.findOne({
    _id: id,
    isActive: true,
  })
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!contact) {
    throw new AppError(httpStatus.NOT_FOUND, "Contact not found");
  }

  return contact;
};

/**
 * UPDATE: Update a contact
 * Tenant filtering is handled automatically by tenantScopePlugin
 */
export const update = async (
  id: string,
  payload: IContactUpdate,
  userId: string,
  logActor?: JwtPayload
): Promise<IContact> => {
  const contact = await Contact.findOne({
    _id: id,
    isActive: true,
  });

  if (!contact) {
    throw new AppError(httpStatus.NOT_FOUND, "Contact not found");
  }

  // Check for duplicate email if email is being changed
  if (payload.email && payload.email !== contact.email) {
    const existingEmailContact = await Contact.findOne({
      email: payload.email,
      isActive: true,
      _id: { $ne: id },
    });

    if (existingEmailContact) {
      throw new AppError(
        httpStatus.CONFLICT,
        `Contact with email '${payload.email}' already exists in this organization`
      );
    }
  }

  // Check for duplicate phone if phone is being changed
  if (payload.phone && payload.phone !== contact.phone) {
    const existingPhoneContact = await Contact.findOne({
      phone: payload.phone,
      isActive: true,
      _id: { $ne: id },
    });

    if (existingPhoneContact) {
      throw new AppError(
        httpStatus.CONFLICT,
        `Contact with phone '${payload.phone}' already exists in this organization`
      );
    }
  }

  // Validate that at least email or phone exists after update
  const updatedEmail = payload.email !== undefined ? payload.email : contact.email;
  const updatedPhone = payload.phone !== undefined ? payload.phone : contact.phone;

  if (!updatedEmail && !updatedPhone) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Contact must have at least email or phone"
    );
  }

  const updatedContact = await Contact.findByIdAndUpdate(
    id,
    {
      ...payload,
      updatedBy: new mongoose.Types.ObjectId(userId),
    },
    { new: true, runValidators: true }
  );

  if (!updatedContact) {
    throw new AppError(httpStatus.NOT_FOUND, "Failed to update contact");
  }

  // Log contact update
  if (logActor && updatedContact) {
    try {
      const actor = logActor;
      const identifier = updatedContact.email || updatedContact.phone || "Unknown";
      await (
        await import("../log/log.controller")
      ).LogControllers.addLog(
        "Contact Updated",
        userId,
        `Contact ${identifier} updated by ${actor?.email || actor?.userId}`,
        logActor
      );
    } catch (e) {
      console.error("Failed to log contact update:", e);
    }
  }

  return updatedContact;
};

/**
 * SOFT DELETE: Soft delete a contact
 * Tenant filtering is handled automatically by tenantScopePlugin
 */
export const softDelete = async (
  id: string,
  userId: string,
  logActor?: JwtPayload
): Promise<void> => {
  const contact = await Contact.findOne({
    _id: id,
    isActive: true,
  });

  if (!contact) {
    throw new AppError(httpStatus.NOT_FOUND, "Contact not found");
  }

  await Contact.findByIdAndUpdate(id, {
    isActive: false,
    updatedBy: new mongoose.Types.ObjectId(userId),
  });

  // Log contact deletion
  if (logActor) {
    try {
      const actor = logActor;
      const identifier = contact.email || contact.phone || "Unknown";
      await (
        await import("../log/log.controller")
      ).LogControllers.addLog(
        "Contact Deleted",
        userId,
        `Contact ${identifier} deleted by ${actor?.email || actor?.userId}`,
        logActor
      );
    } catch (e) {
      console.error("Failed to log contact deletion:", e);
    }
  }
};
const getAllTags = async ( orgId: string)=> {
  const tags = await Contact.distinct("tags", {
    org: orgId,
  });
  return tags;
};

const getUsersCountByTags = async (orgId: string, tags: string[]) => {
  if (!tags || tags.length === 0) {
    return 0;
  }

  const count = await Contact.countDocuments({
    org: orgId,
    tags: { $in: tags }, 
  });

  return count;
};

/**
 * Find or create a contact by email (for appointment booking)
 * Returns existing contact if found, otherwise creates a new one
 */
export const findOrCreateByEmail = async (
  orgId: string,
  email: string,
  additionalData?: {
    name?: string;
    phone?: string;
    contactType?: string;
    tags?: string[];
  },
  createdByUserId?: string
): Promise<{ contact: IContact; isNew: boolean }> => {
  if (!email) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email is required");
  }

  // Check for existing contact
  const existingContact = await Contact.findOne({
    org: orgId,
    email: email.toLowerCase().trim(),
    isActive: true,
  });

  if (existingContact) {
    console.log(`📇 [findOrCreateByEmail] Found existing contact: ${existingContact.email}`);
    return { contact: existingContact, isNew: false };
  }

  // Create new contact
  const contactData = {
    org: new mongoose.Types.ObjectId(orgId),
    email: email.toLowerCase().trim(),
    name: additionalData?.name || "",
    phone: additionalData?.phone || undefined,
    contactType: additionalData?.contactType || "lead",
    tags: additionalData?.tags || ["booking-invitee"],
    createdBy: createdByUserId ? new mongoose.Types.ObjectId(createdByUserId) : undefined,
  };

  const newContact = await Contact.create(contactData);
  console.log(`📇 [findOrCreateByEmail] Created new contact: ${newContact.email}`);

  return { contact: newContact, isNew: true };
};

export const ContactService = {
  create,
  getAll,
  getSingle,
  update,
  softDelete,
  getAllTags,
  getUsersCountByTags,
  findOrCreateByEmail
};
