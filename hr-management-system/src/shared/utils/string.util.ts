export class StringUtil {
  static capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  static capitalizeWords(str: string): string {
    if (!str) return '';
    return str
      .split(' ')
      .map(word => this.capitalize(word))
      .join(' ');
  }

  static toSlug(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static generateEmployeeCode(sequence: number): string {
    return `EMP-${String(sequence).padStart(6, '0')}`;
  }

  static maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    const maskedUsername = username.charAt(0) + 
      '*'.repeat(Math.max(username.length - 2, 1)) + 
      username.charAt(username.length - 1);
    return `${maskedUsername}@${domain}`;
  }

  static truncate(str: string, length: number, suffix: string = '...'): string {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  }

  static removeExtraSpaces(str: string): string {
    return str.replace(/\s+/g, ' ').trim();
  }
}