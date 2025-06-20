import { describe, it, expect } from 'vitest';
import { sanitizeInput } from '../src/utils/security/sanitization';

describe('sanitizeInput', () => {
  it('removes XSS patterns', () => {
    const result = sanitizeInput('Hello <script>alert("XSS")</script> world');
    expect(result).toBe('Hello world');
  });

  it('removes SQL injection patterns', () => {
    const result = sanitizeInput('User input 1; DROP TABLE users');
    expect(result).toBe('User input 1; users');
  });

  it('preserves normal text including IPA notation', () => {
    const text = 'beautiful /ˈbjuːtɪfəl/';
    expect(sanitizeInput(text)).toBe(text);
  });
});
