type PasswordValidationResult = {
  isValid: boolean;
  message?: string;
};

const PASSWORD_MIN_LENGTH = 8;
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /\d/;
const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/;

export function validatePasswordPolicy(password: string): PasswordValidationResult {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!UPPERCASE_REGEX.test(password)) {
    return { isValid: false, message: 'Password must include at least one uppercase letter.' };
  }
  if (!LOWERCASE_REGEX.test(password)) {
    return { isValid: false, message: 'Password must include at least one lowercase letter.' };
  }
  if (!NUMBER_REGEX.test(password)) {
    return { isValid: false, message: 'Password must include at least one number.' };
  }
  if (!SPECIAL_CHAR_REGEX.test(password)) {
    return { isValid: false, message: 'Password must include at least one special character.' };
  }

  return { isValid: true };
}

