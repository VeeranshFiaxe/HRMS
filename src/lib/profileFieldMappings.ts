/**
 * PROFILE FIELD MAPPINGS
 *
 * This is the single source of truth for what Employee Profile fields
 * an onboarding form field can map to.
 *
 * To add a new mappable field in the future:
 *   1. Add a new entry to PROFILE_FIELD_MAPPINGS below.
 *   2. Handle it in the approve route's applyFieldMapping() function.
 *
 * No other code changes are required.
 */

export interface ProfileFieldMapping {
  /** Dot-separated path: "section.fieldKey" */
  value: string;
  /** Human-readable label shown in the form builder dropdown */
  label: string;
  /** Group header label (shown as <optgroup>) */
  group: string;
  /** Field types that make sense for this mapping (optional filter hint) */
  allowedTypes?: string[];
}

export const PROFILE_FIELD_MAPPINGS: ProfileFieldMapping[] = [
  // ─── Basic Information ───────────────────────────────────────────────────
  {
    group: "Basic Information",
    value: "basicInfo.name",
    label: "Full Name",
    allowedTypes: ["SHORT_TEXT"],
  },
  {
    group: "Basic Information",
    value: "basicInfo.email",
    label: "Work / Login Email",
    allowedTypes: ["EMAIL", "SHORT_TEXT"],
  },
  {
    group: "Basic Information",
    value: "basicInfo.personalEmail",
    label: "Personal Email",
    allowedTypes: ["EMAIL", "SHORT_TEXT"],
  },
  {
    group: "Basic Information",
    value: "basicInfo.phone",
    label: "Phone Number",
    allowedTypes: ["PHONE", "SHORT_TEXT"],
  },
  {
    group: "Basic Information",
    value: "basicInfo.department",
    label: "Department",
    allowedTypes: ["SHORT_TEXT", "DROPDOWN"],
  },
  {
    group: "Basic Information",
    value: "basicInfo.designation",
    label: "Designation / Role",
    allowedTypes: ["SHORT_TEXT", "DROPDOWN"],
  },
  {
    group: "Basic Information",
    value: "basicInfo.employmentType",
    label: "Employment Type",
    allowedTypes: ["DROPDOWN"],
  },
  {
    group: "Basic Information",
    value: "basicInfo.dateOfBirth",
    label: "Date of Birth",
    allowedTypes: ["DATE"],
  },
  {
    group: "Basic Information",
    value: "basicInfo.joiningDate",
    label: "Date of Joining",
    allowedTypes: ["DATE"],
  },
  {
    group: "Basic Information",
    value: "basicInfo.emergencyContactName",
    label: "Emergency Contact Name",
    allowedTypes: ["SHORT_TEXT"],
  },
  {
    group: "Basic Information",
    value: "basicInfo.emergencyContactNumber",
    label: "Emergency Contact Number",
    allowedTypes: ["PHONE", "SHORT_TEXT"],
  },

  // ─── Documents ───────────────────────────────────────────────────────────
  {
    group: "Documents",
    value: "docs.Resume",
    label: "Resume / CV",
    allowedTypes: ["FILE_UPLOAD"],
  },
  {
    group: "Documents",
    value: "docs.Aadhaar",
    label: "Aadhaar Card",
    allowedTypes: ["FILE_UPLOAD"],
  },
  {
    group: "Documents",
    value: "docs.PAN",
    label: "PAN Card",
    allowedTypes: ["FILE_UPLOAD"],
  },
  {
    group: "Documents",
    value: "docs.BankDetails",
    label: "Bank Details",
    allowedTypes: ["FILE_UPLOAD"],
  },
  {
    group: "Documents",
    value: "docs.CancelledCheque",
    label: "Cancelled Cheque",
    allowedTypes: ["FILE_UPLOAD"],
  },
  {
    group: "Documents",
    value: "docs.BankStatement",
    label: "Bank Statement",
    allowedTypes: ["FILE_UPLOAD"],
  },
  {
    group: "Documents",
    value: "docs.SalarySlip",
    label: "Salary Slip",
    allowedTypes: ["FILE_UPLOAD"],
  },
  {
    group: "Documents",
    value: "docs.OfferLetter",
    label: "Offer Letter",
    allowedTypes: ["FILE_UPLOAD"],
  },
  {
    group: "Documents",
    value: "docs.Other",
    label: "Other Document",
    allowedTypes: ["FILE_UPLOAD"],
  },
];

/** Returns only mappings appropriate for a given field type */
export function getMappingsForFieldType(fieldType: string): ProfileFieldMapping[] {
  return PROFILE_FIELD_MAPPINGS.filter(
    (m) => !m.allowedTypes || m.allowedTypes.includes(fieldType)
  );
}

/** Returns all unique group names in order */
export function getMappingGroups(): string[] {
  const seen = new Set<string>();
  return PROFILE_FIELD_MAPPINGS.filter((m) => {
    if (seen.has(m.group)) return false;
    seen.add(m.group);
    return true;
  }).map((m) => m.group);
}

/** Looks up a mapping by its value string */
export function getMappingByValue(value: string): ProfileFieldMapping | undefined {
  return PROFILE_FIELD_MAPPINGS.find((m) => m.value === value);
}
