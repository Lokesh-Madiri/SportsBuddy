import {
  getInitials,
  isValidEmail,
  isValidPassword,
  truncate,
} from './helpers';

describe('helpers utility functions', () => {
  describe('getInitials', () => {
    test('returns correct initials for multi-word names', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('Marcus Thompson')).toBe('MT');
      expect(getInitials('sarah kelly')).toBe('SK');
    });

    test('handles single word names', () => {
      expect(getInitials('Alex')).toBe('A');
    });

    test('limits initials to maximum of 2 characters', () => {
      expect(getInitials('John Fitzgerald Kennedy')).toBe('JF');
    });
  });

  describe('isValidEmail', () => {
    test('returns true for valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+label@domain.co.uk')).toBe(true);
    });

    test('returns false for invalid emails', () => {
      expect(isValidEmail('plainaddress')).toBe(false);
      expect(isValidEmail('@missingusername.com')).toBe(false);
      expect(isValidEmail('username@.com')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    test('returns valid true for passwords with 6 or more characters', () => {
      const result = isValidPassword('123456');
      expect(result.valid).toBe(true);
      expect(result.message).toBe('');
    });

    test('returns valid false with error message for passwords shorter than 6 characters', () => {
      const result = isValidPassword('12345');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password must be at least 6 characters');
    });
  });

  describe('truncate', () => {
    test('truncates long text and appends ellipsis', () => {
      expect(truncate('This is a very long text', 10)).toBe('This is a ...');
    });

    test('does not truncate text shorter than or equal to max length', () => {
      expect(truncate('Short text', 20)).toBe('Short text');
      expect(truncate('Exact length', 12)).toBe('Exact length');
    });
  });
});
