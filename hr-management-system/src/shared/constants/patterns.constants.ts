export const PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  
  PHONE: {
    INTERNATIONAL: /^\+[1-9]\d{1,14}$/,
    US: /^(\+1)?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/,
  },
  
  USERNAME: /^[a-zA-Z0-9_-]{3,30}$/,
  
  EMPLOYEE_CODE: /^EMP-\d{6}$/,
  
  DEPARTMENT_CODE: /^[A-Z]{2,10}$/,
  
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  
  DATE: {
    ISO: /^\d{4}-\d{2}-\d{2}$/,
    US: /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/,
  },
  
  TIME: {
    HOUR_24: /^([01]\d|2[0-3]):([0-5]\d)$/,
    HOUR_12: /^(0?[1-9]|1[0-2]):[0-5]\d\s?(am|pm|AM|PM)$/,
  },
  
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  
  ALPHABETIC: /^[a-zA-Z]+$/,
  
  NUMERIC: /^\d+$/,
  
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
} as const;