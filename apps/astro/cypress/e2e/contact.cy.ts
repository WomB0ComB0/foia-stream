/**
 * Copyright (c) 2025 Foia Stream
 * Contact Page E2E Tests
 */

describe('Contact Page', () => {
  beforeEach(() => {
    cy.visit('/contact');
  });

  describe('Page Rendering', () => {
    it('should display the contact page', () => {
      cy.contains(/Contact|Get in Touch/i).should('be.visible');
    });

    it('should have a contact form', () => {
      cy.get('form').should('exist');
    });
  });

  describe('Contact Form Fields', () => {
    it('should have name input', () => {
      cy.get('input[name="name"], input[placeholder*="Name"]').should('exist');
    });

    it('should have email input', () => {
      cy.get('input[name="email"], input[type="email"]').should('exist');
    });

    it('should have subject input', () => {
      cy.get('input[name="subject"], input[placeholder*="Subject"]').should('exist');
    });

    it('should have message textarea', () => {
      cy.get('textarea[name="message"], textarea').should('exist');
    });

    it('should have submit button', () => {
      cy.get('button[type="submit"]').should('exist');
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty email', () => {
      cy.get('button[type="submit"]').click();
      cy.get('input:invalid').should('exist');
    });

    it('should validate email format', () => {
      cy.get('input[type="email"]').type('invalid-email');
      cy.get('button[type="submit"]').click();
      cy.get('input[type="email"]:invalid').should('exist');
    });
  });

  describe('Form Submission', () => {
    it('should submit valid form', () => {
      cy.mockApi('POST', '/contact', { success: true });

      cy.get('input[name="name"], input[placeholder*="Name"]').first().type('Test User');
      cy.get('input[type="email"]').type('test@example.com');
      cy.get('input[name="subject"], input[placeholder*="Subject"]').first().type('Test Subject');
      cy.get('textarea').type('This is a test message');
      cy.get('button[type="submit"]').click();
    });
  });

  describe('Contact Information', () => {
    it('should display contact information', () => {
      // Check for email addresses on the page
      cy.contains('support@foiastream.com').should('exist');
    });
  });

  describe('Responsive Design', () => {
    it('should work on mobile', () => {
      cy.viewport('iphone-x');
      cy.get('form').should('be.visible');
    });
  });
});
