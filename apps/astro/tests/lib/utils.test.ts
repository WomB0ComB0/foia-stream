/**
 * Copyright (c) 2025 Foia Stream
 */

import { describe, expect, it } from 'vitest';
import { CATEGORIES, cn, formatDate, formatDateTime, getStatusColor } from '../../src/lib/utils';

describe('cn - className merger', () => {
  it('should merge class names', () => {
    const result = cn('px-4', 'py-2');
    expect(result).toBe('px-4 py-2');
  });

  it('should handle conflicting tailwind classes', () => {
    const result = cn('px-4', 'px-6');
    expect(result).toBe('px-6');
  });

  it('should handle conditional classes', () => {
    const result = cn('base', false && 'hidden', true && 'visible');
    expect(result).toBe('base visible');
  });

  it('should handle undefined and null values', () => {
    const result = cn('base', undefined, null);
    expect(result).toBe('base');
  });

  it('should handle arrays of classes', () => {
    const result = cn(['px-4', 'py-2']);
    expect(result).toBe('px-4 py-2');
  });

  it('should handle empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });
});

describe('formatDate', () => {
  it('should format a valid date string', () => {
    const result = formatDate('2024-01-15T10:30:00Z');
    expect(result).toMatch(/Jan\s+15,\s+2024/);
  });

  it('should return em dash for null', () => {
    const result = formatDate(null);
    expect(result).toBe('—');
  });

  it('should return em dash for undefined', () => {
    const result = formatDate(undefined);
    expect(result).toBe('—');
  });

  it('should handle different date formats', () => {
    // Note: Date parsing without time defaults to UTC midnight
    // which may show as previous day in local timezone
    const result = formatDate('2024-12-25');
    expect(result).toMatch(/Dec\s+2[45],\s+2024/); // Allow 24 or 25 due to timezone
  });
});

describe('formatDateTime', () => {
  it('should format date with time', () => {
    const result = formatDateTime('2024-01-15T10:30:00Z');
    // Output varies by timezone, just check it includes date parts
    expect(result).toMatch(/Jan\s+15,\s+2024/);
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('should return em dash for null', () => {
    const result = formatDateTime(null);
    expect(result).toBe('—');
  });

  it('should return em dash for undefined', () => {
    const result = formatDateTime(undefined);
    expect(result).toBe('—');
  });
});

describe('getStatusColor', () => {
  it('should return correct color for draft status', () => {
    const result = getStatusColor('draft');
    expect(result).toContain('bg-surface-500');
  });

  it('should return correct color for submitted status', () => {
    const result = getStatusColor('submitted');
    expect(result).toContain('bg-blue-600');
  });

  it('should return correct color for acknowledged status', () => {
    const result = getStatusColor('acknowledged');
    expect(result).toContain('bg-indigo-600');
  });

  it('should return correct color for processing status', () => {
    const result = getStatusColor('processing');
    expect(result).toContain('bg-purple-600');
  });

  it('should return correct color for fulfilled status', () => {
    const result = getStatusColor('fulfilled');
    expect(result).toContain('bg-emerald-600');
  });

  it('should return correct color for denied status', () => {
    const result = getStatusColor('denied');
    expect(result).toContain('bg-red-600');
  });

  it('should return correct color for appealed status', () => {
    const result = getStatusColor('appealed');
    expect(result).toContain('bg-orange-600');
  });

  it('should return default color for unknown status', () => {
    const result = getStatusColor('unknown');
    expect(result).toContain('bg-surface-600');
  });
});

describe('CATEGORIES', () => {
  it('should be an array', () => {
    expect(Array.isArray(CATEGORIES)).toBe(true);
  });

  it('should have value and label for each category', () => {
    CATEGORIES.forEach((category) => {
      expect(category).toHaveProperty('value');
      expect(category).toHaveProperty('label');
      expect(typeof category.value).toBe('string');
      expect(typeof category.label).toBe('string');
    });
  });

  it('should include body_cam_footage category', () => {
    const bodyCam = CATEGORIES.find((c) => c.value === 'body_cam_footage');
    expect(bodyCam).toBeDefined();
    expect(bodyCam?.label).toBe('Body Camera Footage');
  });

  it('should include contract category', () => {
    const contract = CATEGORIES.find((c) => c.value === 'contract');
    expect(contract).toBeDefined();
    expect(contract?.label).toBe('Contract');
  });

  it('should have at least 5 categories', () => {
    expect(CATEGORIES.length).toBeGreaterThanOrEqual(5);
  });
});
