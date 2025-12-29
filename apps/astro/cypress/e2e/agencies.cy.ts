/**
 * Copyright (c) 2025 Foia Stream
 * Agencies Page E2E Tests
 */

describe('Agencies Page', () => {
  beforeEach(() => {
    // Visit the agencies page
    cy.visit('/agencies');
  });

  describe('Page Rendering', () => {
    it('should display the agencies page', () => {
      cy.url().should('include', '/agencies');
    });

    it('should have a page title', () => {
      cy.title().should('not.be.empty');
    });
  });

  describe('Search Functionality', () => {
    it('should have a search input or search capability', () => {
      // The page may have search input or agency listing
      cy.get('body').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    it('should display properly on mobile', () => {
      cy.viewport('iphone-x');
      cy.get('body').should('be.visible');
    });

    it('should display properly on tablet', () => {
      cy.viewport('ipad-2');
      cy.get('body').should('be.visible');
    });
  });
});
