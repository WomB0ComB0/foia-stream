/**
 * Copyright (c) 2025 Foia Stream
 * Cypress E2E Support File
 */

// Import commands
import { beforeEach } from "vitest";
import './commands';

// Global configurations
Cypress.on('uncaught:exception', (err) => {
  // Ignore React hydration errors (common in SSR frameworks like Astro)
  if (err.message.includes('Hydration failed')) {
    return false;
  }
  if (err.message.includes('hydration mismatch')) {
    return false;
  }
  if (err.message.includes('text content does not match')) {
    return false;
  }
  // Ignore ResizeObserver errors
  if (err.message.includes('ResizeObserver loop')) {
    return false;
  }
  // Ignore dynamically imported module errors
  if (err.message.includes('Failed to fetch dynamically imported module')) {
    return false;
  }
  return true;
});

// Setup before each test
beforeEach(() => {
  // Clear cookies and local storage
  cy.clearCookies();
  cy.clearLocalStorage();
});
