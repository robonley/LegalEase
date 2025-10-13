export interface AddressData {
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postal?: string;
  country?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const PO_BOX_REGEX = /P\.?\s*O\.?\s*Box/i;

export const ADDRESS_VALIDATION_ERRORS = {
  PO_BOX: "PO Box addresses are not accepted for Ontario addresses",
  NOT_ONTARIO: "Address must be in Ontario (ON)",
  MISSING_REGION: "Province/Region is required",
  MISSING_LINE1: "Street address (Line 1) is required",
  MISSING_CITY: "City is required",
  MISSING_POSTAL: "Postal code is required",
  MISSING_COUNTRY: "Country is required",
};

export function validateOntarioAddress(address: AddressData): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (!address.line1?.trim()) {
    errors.push(ADDRESS_VALIDATION_ERRORS.MISSING_LINE1);
  }

  if (!address.city?.trim()) {
    errors.push(ADDRESS_VALIDATION_ERRORS.MISSING_CITY);
  }

  if (!address.postal?.trim()) {
    errors.push(ADDRESS_VALIDATION_ERRORS.MISSING_POSTAL);
  }

  if (!address.country?.trim()) {
    errors.push(ADDRESS_VALIDATION_ERRORS.MISSING_COUNTRY);
  }

  // Check if PO Box
  if (address.line1 && PO_BOX_REGEX.test(address.line1)) {
    errors.push(ADDRESS_VALIDATION_ERRORS.PO_BOX);
  }

  // Check if region is provided and is Ontario
  if (!address.region?.trim()) {
    errors.push(ADDRESS_VALIDATION_ERRORS.MISSING_REGION);
  } else if (address.region.toUpperCase() !== "ON") {
    errors.push(ADDRESS_VALIDATION_ERRORS.NOT_ONTARIO);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
