/**
 * Copyright (c) 2025 Foia Stream
 * Templates Page E2E Tests
 */

describe('Templates Page', () => {
  beforeEach(() => {
    cy.visit('/templates');
  });

  describe('Page Rendering', () => {
    it('should display the templates page', () => {
      cy.url().should('include', '/templates');
    });

    it('should have a page title', () => {
      cy.title().should('not.be.empty');
    });
  });

  describe('Page Content', () => {
    it('should display page content', () => {
      cy.get('body').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    it('should display properly on mobile', () => {
      cy.viewport('iphone-x');
      cy.get('body').should('be.visible');
    });
  });
});
