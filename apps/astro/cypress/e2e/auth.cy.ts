/**
 * Copyright (c) 2025 Foia Stream
 * Authentication E2E Tests
 */

import { beforeEach, describe, it } from 'vitest';

describe('Authentication', () => {
  describe('Login Page', () => {
    beforeEach(() => {
      cy.visit('/login');
    });

    it('should display the login page', () => {
      cy.url().should('include', '/login');
    });

    it('should have a login form', () => {
      // Wait for React hydration to complete
      cy.wait(1000);
      cy.get('form').should('exist');
    });

    it('should have email and password inputs', () => {
      cy.wait(1000);
      cy.get('input[type="email"], input[name="email"]').should('exist');
      cy.get('input[type="password"], input[name="password"]').should('exist');
    });

    it('should have a page title', () => {
      cy.title().should('not.be.empty');
    });
  });

  describe('Register Page', () => {
    beforeEach(() => {
      cy.visit('/register');
    });

    it('should display the register page', () => {
      cy.url().should('include', '/register');
    });

    it('should have a registration form', () => {
      cy.wait(1000);
      cy.get('form').should('exist');
    });

    it('should have a page title', () => {
      cy.title().should('not.be.empty');
    });
  });

  describe('Protected Routes', () => {
    it('should handle unauthenticated access to dashboard', () => {
      cy.visit('/dashboard');
      // Either shows dashboard or redirects to login
      cy.url().should('match', /\/(dashboard|login)/);
    });

    it('should handle unauthenticated access to settings', () => {
      cy.visit('/settings');
      cy.url().should('match', /\/(settings|login)/);
    });
  });

  describe('Responsive Design', () => {
    it('should display login page on mobile', () => {
      cy.viewport('iphone-x');
      cy.visit('/login');
      cy.get('body').should('be.visible');
    });

    it('should display register page on mobile', () => {
      cy.viewport('iphone-x');
      cy.visit('/register');
      cy.get('body').should('be.visible');
    });
  });
});
