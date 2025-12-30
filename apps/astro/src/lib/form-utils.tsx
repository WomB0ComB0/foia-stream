/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Form utilities and Zod schemas for TanStack Form
 * @module lib/form-utils
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
/** biome-ignore-all lint/suspicious/noExplicitAny: <explanation> <explanation> */

import { detectThreatPatterns, validateSafeEmail, validateSafeName } from '@foia-stream/shared';
import type { ReactNode } from 'react';
import { z } from 'zod';

// ============================================
// Zod Validation Schemas with Security Validation
// ============================================

/**
 * Email validation schema with threat detection
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .refine(validateSafeEmail, {
    message: 'Email contains potentially unsafe characters',
  });

/**
 * Password validation schema with security requirements
 * Note: Passwords are hashed, so injection is less of a concern,
 * but we still check for obvious script injection
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .refine(
    (val) => {
      // Only check for script injection in passwords (not SQL since passwords are hashed)
      const result = detectThreatPatterns(val, {
        checkXSS: true,
        checkSQLInjection: false,
        checkNoSQLInjection: false,
        checkCommandInjection: false,
        checkPathTraversal: false,
        checkHomoglyphs: false,
      });
      return result.isSafe;
    },
    { message: 'Password contains potentially unsafe content' },
  );

/**
 * Simple password schema for login (less strict, just checks presence)
 */
const loginPasswordSchema = z.string().min(1, 'Password is required');

/**
 * Name validation schema with threat detection
 * Allows international characters while blocking injection
 */
const safeNameSchema = z
  .string()
  .min(1, 'This field is required')
  .max(100, 'Name is too long')
  .refine(validateSafeName, {
    message: 'Name contains invalid characters',
  });

/**
 * Safe text schema for general text fields
 * Allows more content but checks for injection patterns
 */
const safeTextSchema = (minLength: number, maxLength: number, fieldName: string) =>
  z
    .string()
    .min(minLength, `${fieldName} is required`)
    .max(maxLength, `${fieldName} must be less than ${maxLength} characters`)
    .refine(
      (val) => {
        const result = detectThreatPatterns(val);
        return result.isSafe;
      },
      {
        message: 'Input contains potentially unsafe content',
      },
    );

/**
 * Login form schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Registration form schema with enhanced security validation
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    firstName: safeNameSchema,
    lastName: safeNameSchema,
    organization: z
      .string()
      .max(200, 'Organization name is too long')
      .refine(
        (val) => {
          if (!val) return true; // Optional field
          const result = detectThreatPatterns(val);
          return result.isSafe;
        },
        { message: 'Organization name contains potentially unsafe content' },
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * New FOIA request form schema with security validation
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
export const newRequestSchema = z
  .object({
    agencyId: z.string().min(1, 'Please select an agency'),
    category: z.string().min(1, 'Please select a category'),
    title: safeTextSchema(1, 200, 'Title'),
    description: safeTextSchema(1, 10000, 'Description'),
    dateRangeStart: z.string(),
    dateRangeEnd: z.string(),
    templateId: z.string(),
    isPublic: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.dateRangeStart && data.dateRangeEnd) {
        return new Date(data.dateRangeStart) <= new Date(data.dateRangeEnd);
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['dateRangeEnd'],
    },
  );

export type NewRequestFormData = z.infer<typeof newRequestSchema>;

// ============================================
// Form Field Components
// ============================================

/**
 * Props for form field wrapper
 */
interface FieldWrapperProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  hint?: string;
}

/**
 * Consistent styling for form field labels
 */
export const labelClass = 'block text-sm font-medium text-surface-300';

/**
 * Consistent styling for form inputs
 */
export const inputClass =
  'mt-2 block w-full rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-surface-100 placeholder-surface-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500';

/**
 * Consistent styling for form inputs with error state
 */
export const inputErrorClass =
  'mt-2 block w-full rounded-lg border border-red-500 bg-surface-800 px-4 py-3 text-surface-100 placeholder-surface-500 transition-colors focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400';

/**
 * Field wrapper component that provides consistent layout and error display
 */
export function FieldWrapper({
  label,
  htmlFor,
  required,
  error,
  children,
  hint,
}: FieldWrapperProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
        {!required && <span className="text-surface-500 ml-1">(optional)</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-surface-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

/**
 * Get the first error message from a field
 */
export function getFieldError(field: any): string | undefined {
  if (field.state.meta.isTouched && field.state.meta.errors.length > 0) {
    const firstError = field.state.meta.errors[0];
    // Handle both string errors and Zod error objects
    if (typeof firstError === 'string') {
      return firstError;
    }
    if (firstError && typeof firstError === 'object' && 'message' in firstError) {
      return (firstError as { message: string }).message;
    }
  }
  return undefined;
}

/**
 * Check if a field has errors
 */
export function hasFieldError(field: any): boolean {
  return field.state.meta.isTouched && field.state.meta.errors.length > 0;
}

/**
 * Get input class based on error state
 */
export function getInputClass(field: any): string {
  return hasFieldError(field) ? inputErrorClass : inputClass;
}

/**
 * Check if form can be submitted
 */
export function canSubmit(form: any): boolean {
  return form.state.canSubmit && !form.state.isSubmitting;
}
