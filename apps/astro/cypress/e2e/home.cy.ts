/**
 * Copyright (c) 2025 Foia Stream
 * Homepage E2E Tests
 */

describe('Homepage', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Page Rendering', () => {
    it('should load the homepage successfully', () => {
      cy.url().should('eq', Cypress.config().baseUrl + '/');
    });

    it('should display the navigation', () => {
      cy.get('nav').should('be.visible');
    });

    it('should display the logo', () => {
      cy.contains('FOIA').should('be.visible');
    });

    it('should have proper page title', () => {
      cy.title().should('not.be.empty');
    });
  });

  describe('Hero Section', () => {
    it('should display the hero headline', () => {
      cy.contains('Public Records').should('be.visible');
    });

    it('should display the CTA button', () => {
      cy.contains('Start Filing Requests').should('be.visible');
    });
  });

  describe('Navigation', () => {
    it('should navigate to login page', () => {
      cy.contains('a', /sign in/i).click();
      cy.url().should('include', '/login');
    });

    it('should navigate to register page', () => {
      cy.contains('a', /get started/i)
        .first()
        .click();
      cy.url().should('include', '/register');
    });
  });

  describe('Responsiveness', () => {
    it('should display correctly on mobile viewport', () => {
      cy.viewport('iphone-x');
      cy.get('nav').should('be.visible');
    });

    it('should display correctly on tablet viewport', () => {
      cy.viewport('ipad-2');
      cy.get('nav').should('be.visible');
    });

    it('should display correctly on desktop viewport', () => {
      cy.viewport(1920, 1080);
      cy.get('nav').should('be.visible');
    });
  });

  describe('Footer', () => {
    it('should display the footer', () => {
      cy.get('footer').should('exist');
    });

    it('should have privacy and terms links', () => {
      cy.get('footer').contains('Privacy').should('exist');
      cy.get('footer').contains('Terms').should('exist');
    });
  });
});
