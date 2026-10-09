"use strict";

/**
 * Auth Validators
 *
 * Pure validation functions — no Express dependency, no database calls.
 * Each function returns { valid: true } or { valid: false, message: "..." }.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Validate registration input.
 */
function validateRegister({ firstName, lastName, email, password }) {
  if (!firstName || !firstName.trim()) {
    return { valid: false, message: "First name is required" };
  }
  if (!lastName || !lastName.trim()) {
    return { valid: false, message: "Last name is required" };
  }
  if (!email || !email.trim()) {
    return { valid: false, message: "Email is required" };
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return { valid: false, message: "Please provide a valid email address" };
  }
  if (!password) {
    return { valid: false, message: "Password is required" };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid:   false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }
  return { valid: true };
}

/**
 * Validate login input.
 */
function validateLogin({ email, password }) {
  if (!email || !email.trim()) {
    return { valid: false, message: "Email is required" };
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return { valid: false, message: "Please provide a valid email address" };
  }
  if (!password) {
    return { valid: false, message: "Password is required" };
  }
  return { valid: true };
}

module.exports = { validateRegister, validateLogin };
