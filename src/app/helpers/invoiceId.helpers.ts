import { Types } from "mongoose";
import httpStatus from "http-status-codes";
import AppError from "../errorHelpers/AppError";

/**
 * Generate invoice ID based on organization name and invoice count
 * Format: {OrgCode}-{Sequence}
 * 
 * Examples:
 * - Thunder Client Limited → TCL-0001, TCL-0002, etc.
 * - Google → GOO-0001, GOO-0002, etc.
 * - One Two Three Four → OTT-0001, OTT-0002, etc.
 * 
 * @param orgId - Organization ID (string or ObjectId)
 * @returns Generated invoice ID (e.g., "TCL-0011")
 */
export const generateInvoiceId = async (orgId: string | Types.ObjectId): Promise<string> => {
  // Import models to avoid circular dependency
  const { Org } = await import("../modules/org/org.model");
  const { Invoice } = await import("../modules/invoice/invoice.model");

  // Fetch organization details
  const organization = await Org.findById(orgId);
  
  if (!organization) {
    throw new AppError(httpStatus.NOT_FOUND, "Organization not found");
  }

  const orgName = organization.orgName;
  
  if (!orgName) {
    throw new AppError(httpStatus.BAD_REQUEST, "Organization name not found");
  }

  // Generate organization code from organization name
  const generateOrgCode = (name: string): string => {
    // Remove extra spaces and trim
    const cleanName = name.trim().replace(/\s+/g, ' ');
    const words = cleanName.split(' ');

    let code: string;
    if (words.length === 1) {
      // Single word: take first 3 letters
      code = words[0].substring(0, 3);
    } else {
      // Multiple words: take first letter of each word (max 3 words)
      code = words
        .slice(0, 3)
        .map(word => word.charAt(0))
        .join('');
    }

    return code.toUpperCase();
  };

  const orgCode = generateOrgCode(orgName);

  // Fetch all invoices for this organization with invoiceId
  const invoicesWithIds = await Invoice.find({
    organizationId: orgId,
    invoiceId: { $exists: true, $nin: [null, ''] },
    isDeleted: false
  }).select('invoiceId').lean();

  // Parse existing invoice IDs to find the latest sequence number
  let maxSequence = 0;
  const invoiceIdPattern = new RegExp(`^${orgCode}-(\\d+)$`, 'i');

  for (const invoice of invoicesWithIds) {
    const match = invoice.invoiceId?.match(invoiceIdPattern);
    if (match && match[1]) {
      const sequence = parseInt(match[1], 10);
      if (sequence > maxSequence) {
        maxSequence = sequence;
      }
    }
  }

  // Increment sequence (total invoices + 1)
  const nextSequence = maxSequence + 1;

  // Format sequence with minimum 4 digits, expanding as needed
  // If nextSequence is 5, format as 0005
  // If nextSequence is 11, format as 0011
  // If nextSequence is 10000, format as 10000 (auto-expands)
  const sequenceStr = nextSequence.toString().padStart(4, '0');

  // Generate final Invoice ID
  const invoiceId = `${orgCode}-${sequenceStr}`;

  return invoiceId;
};
