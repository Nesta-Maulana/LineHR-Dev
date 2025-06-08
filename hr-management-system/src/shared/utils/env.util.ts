export class EnvUtil {
  static getInt(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (value === undefined || value === '') {
      return defaultValue;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  static getString(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
  }

  static getBoolean(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (value === undefined || value === '') {
      return defaultValue;
    }
    return value.toLowerCase() === 'true';
  }
}