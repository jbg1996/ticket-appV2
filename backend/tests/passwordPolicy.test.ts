import { describe, expect, it } from 'vitest';
import { validatePasswordPolicy } from '../src/utils/passwordPolicy.js';

describe('validatePasswordPolicy', () => {
  it('fails when uppercase is missing', () => {
    const result = validatePasswordPolicy('password1!');
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('uppercase');
  });

  it('fails when lowercase is missing', () => {
    const result = validatePasswordPolicy('PASSWORD1!');
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('lowercase');
  });

  it('fails when number is missing', () => {
    const result = validatePasswordPolicy('Password!');
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('number');
  });

  it('fails when special character is missing', () => {
    const result = validatePasswordPolicy('Password1');
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('special');
  });

  it('fails when length is shorter than 8', () => {
    const result = validatePasswordPolicy('Pa1!');
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('at least 8');
  });

  it('passes when all requirements are met', () => {
    const result = validatePasswordPolicy('Password1!');
    expect(result.isValid).toBe(true);
    expect(result.message).toBeUndefined();
  });
});

