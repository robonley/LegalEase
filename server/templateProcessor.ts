import type { Template } from "@shared/schema";

// Template variable definitions for CBCA Minute Book
export const CBCA_TEMPLATE_VARIABLES = {
  // Company Information
  'CompanyName': {
    field: 'organization.name',
    type: 'string',
    description: 'Legal name of the corporation'
  },
  'COMPANYNAME': {
    field: 'organization.name',
    type: 'string',
    transform: 'uppercase',
    description: 'Legal name of the corporation (uppercase)'
  },
  'Date': {
    field: 'organization.incorporationDate',
    type: 'date',
    fallback: 'current_date',
    description: 'Date of incorporation or current date'
  },
  'Registered Office Address': {
    field: 'organization.registeredOffice',
    type: 'address',
    description: 'Complete registered office address'
  },

  // Directors and Officers
  'Director Names': {
    field: 'people.directors',
    type: 'list',
    format: 'name_list',
    description: 'List of all current directors'
  },
  'Director Name': {
    field: 'people.directors[0].name',
    type: 'string',
    description: 'First director name (for single signatures)'
  },
  'Officer Name': {
    field: 'people.officers',
    type: 'dynamic',
    description: 'Officer names by role (President, Secretary, CFO)'
  },
  'Number of Directors': {
    field: 'people.directors.length',
    type: 'number',
    description: 'Total number of directors'
  },

  // Shareholders
  'Shareholder': {
    field: 'people.shareholders[0].name',
    type: 'string',
    description: 'Primary shareholder name'
  },
  'Shareholder Name': {
    field: 'people.shareholders',
    type: 'list',
    format: 'name_list',
    description: 'List of all shareholders'
  },

  // Financial Information
  'SharePrice': {
    field: 'shareClasses[0].price',
    type: 'currency',
    default: '1.00',
    description: 'Price per share'
  },
  'CURRENCY': {
    field: 'organization.currency',
    type: 'string',
    default: 'CAD',
    description: 'Currency code'
  },
  'numberShares': {
    field: 'shareIssuances.quantity',
    type: 'number',
    default: '100',
    description: 'Number of shares being issued'
  },
  'TotalSharePrice': {
    field: 'calculated',
    type: 'currency',
    formula: 'numberShares * SharePrice',
    description: 'Total value of share issuance'
  },

  // Corporate Details
  'Fiscal Year End': {
    field: 'organization.fiscalYearEnd',
    type: 'date',
    format: 'month_day',
    default: 'December 31',
    description: 'Fiscal year end date'
  },
  'Signing Authority Options': {
    field: 'organization.signingAuthority',
    type: 'string',
    default: 'any two officers',
    description: 'Corporate signing authority requirements'
  }
};

// Extract variables from template content
export function extractTemplateVariables(content: string): string[] {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const variables: Set<string> = new Set();
  let match;

  while ((match = variableRegex.exec(content)) !== null) {
    variables.add(match[1].trim());
  }

  return Array.from(variables);
}

// Create variable mapping for template
export function createVariableMapping(variables: string[]) {
  const mapping: Record<string, any> = {};
  
  variables.forEach(variable => {
    if (CBCA_TEMPLATE_VARIABLES[variable]) {
      mapping[variable] = CBCA_TEMPLATE_VARIABLES[variable];
    } else {
      // Create default mapping for unknown variables
      mapping[variable] = {
        field: 'custom',
        type: 'string',
        description: `Custom variable: ${variable}`,
        requiresMapping: true
      };
    }
  });

  return mapping;
}

// Generate document data from entity information
export function generateDocumentData(entityData: any, variableMapping: Record<string, any>) {
  const documentData: Record<string, any> = {};
  
  Object.entries(variableMapping).forEach(([variable, config]) => {
    try {
      documentData[variable] = extractFieldValue(entityData, config);
    } catch (error) {
      console.warn(`Failed to extract value for variable ${variable}:`, error);
      documentData[variable] = config.default || `[${variable}]`;
    }
  });

  return documentData;
}

// Extract field value based on configuration
function extractFieldValue(entityData: any, config: any): any {
  const { field, type, transform, default: defaultValue, format } = config;
  
  if (field === 'calculated') {
    // Handle calculated fields
    return handleCalculatedField(entityData, config);
  }

  if (field === 'current_date') {
    return formatDate(new Date(), format);
  }

  // Navigate object path (e.g., 'organization.name')
  const value = getNestedValue(entityData, field);
  
  if (value === undefined || value === null) {
    return defaultValue || `[${field}]`;
  }

  // Apply transformations
  switch (type) {
    case 'date':
      return formatDate(value, format);
    case 'currency':
      return formatCurrency(value);
    case 'list':
      return formatList(value, format);
    case 'address':
      return formatAddress(value);
    default:
      return transform === 'uppercase' ? String(value).toUpperCase() : value;
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    if (key.includes('[') && key.includes(']')) {
      // Handle array access like 'people.directors[0].name'
      const [arrayKey, indexPart] = key.split('[');
      const index = parseInt(indexPart.replace(']', ''));
      return current?.[arrayKey]?.[index];
    }
    return current?.[key];
  }, obj);
}

function handleCalculatedField(entityData: any, config: any): any {
  // Handle formula-based calculations
  if (config.formula === 'numberShares * SharePrice') {
    const shares = getNestedValue(entityData, 'shareIssuances.quantity') || 100;
    const price = getNestedValue(entityData, 'shareClasses[0].price') || 1.00;
    return formatCurrency(shares * price);
  }
  return '[Calculated]';
}

function formatDate(date: Date | string, format?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'month_day') {
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }
  
  return d.toLocaleDateString('en-CA'); // Canadian date format
}

function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(2);
}

function formatList(items: any[], format?: string): string {
  if (!Array.isArray(items)) return String(items);
  
  if (format === 'name_list') {
    return items.map(item => 
      typeof item === 'string' ? item : `${item.firstName} ${item.lastName}`
    ).join(', ');
  }
  
  return items.join(', ');
}

function formatAddress(address: any): string {
  if (typeof address === 'string') return address;
  
  if (address && typeof address === 'object') {
    const parts = [
      address.street,
      address.city,
      address.province || address.state,
      address.postalCode || address.zipCode,
      address.country
    ].filter(Boolean);
    
    return parts.join(', ');
  }
  
  return '[Address]';
}