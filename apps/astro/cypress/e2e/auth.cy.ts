/**
 * Copyright (c) 2025 Foia Stream
 * Authentication E2E Tests
 */

describe('Authentication', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  describe('Login Page', () => {
    beforeEach(() => {
      cy.visit('/login');
    });

    it('should display the login page', () => {
      cy.contains(/Sign in|Login/i).should('be.visible');
    });

    it('should have a login form', () => {
      cy.get('form').should('exist');
    });

    it('should have email and password inputs', () => {
      cy.get('input[name="email"]').should('exist');
      cy.get('input[type="password"], input[name="password"]').should('exist');
    });

    it('should show validation errors for empty form', () => {
      cy.get('button[type="submit"]').click();
      cy.get('input:invalid').should('have.length.gt', 0);
    });

    it('should login successfully', () => {
      cy.intercept('POST', '**/auth/login', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            token: 'fake-token',
            user: {
              id: '1',
              email: 'test@example.com',
              role: 'civilian',
              firstName: 'Test',
              lastName: 'User',
              organization: 'Test Org',
              isVerified: true,
              isAnonymous: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        },
      }).as('login');

      cy.get('input[name="email"]').type('test@example.com');
      cy.get('input[name="password"]').type('password123');
      cy.get('button[type="submit"]').click();

      cy.wait('@login');
      cy.url().should('include', '/dashboard');
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

    it('should register successfully', () => {
      cy.intercept('POST', '**/auth/register', {
        statusCode: 201,
        body: {
          success: true,
          data: {
            token: 'fake-token',
            user: {
              id: '1',
              email: 'newuser@example.com',
              role: 'civilian',
              firstName: 'New',
              lastName: 'User',
              organization: 'New Org',
              isVerified: false,
              isAnonymous: false,
              createdAt: new Date().toISOString(),
            },
          },
        },
      }).as('register');

      // Fill text fields - ensure they are enabled first
      cy.get('input[name="firstName"]').should('not.be.disabled').type('New');
      cy.get('input[name="lastName"]').should('not.be.disabled').type('User');
      cy.get('input[name="email"]').should('not.be.disabled').type('newuser@example.com');
      cy.get('input[name="organization"]').should('not.be.disabled').type('New Org');
      cy.get('input[name="password"]').should('not.be.disabled').type('password123');
      cy.get('input[name="confirmPassword"]').should('not.be.disabled').type('password123');

      // Handle Terms of Service
      cy.contains('button', 'Read & Accept').first().click(); // Opens Terms modal
      cy.get('.fixed.inset-0 .overflow-y-auto').should('be.visible').scrollTo('bottom'); // Scroll modal
      cy.wait(1000); // Wait for scroll detection
      cy.contains('button', 'I Accept').should('not.be.disabled').click();
      cy.contains('h2', 'Terms of Service').should('not.exist'); // Wait for modal to close
      cy.contains('p', 'Terms of Service').parent().contains('Accepted'); // Verify acceptance

      // Handle Privacy Policy
      cy.contains('button', 'Read & Accept').click(); // Opens Privacy modal
      cy.get('.fixed.inset-0 .overflow-y-auto').should('be.visible').scrollTo('bottom'); // Scroll modal
      cy.wait(1000); // Wait for scroll detection
      cy.contains('button', 'I Accept').should('not.be.disabled').click();
      cy.contains('h2', 'Privacy Policy').should('not.exist'); // Wait for modal to close
      cy.contains('p', 'Privacy Policy').parent().contains('Accepted'); // Verify acceptance

      // Handle Data Processing Consent
      cy.get('input[name="dataProcessingAccepted"]').check();

      // Submit - ensure button is enabled and visible, then force click to avoid covering issues
      cy.get('button[type="submit"]')
        .scrollIntoView()
        .should('be.visible')
        .should('not.be.disabled')
        .click({ force: true });

      cy.wait('@register');
      cy.url().should('include', '/dashboard');
    });
  });

  describe('Protected Routes', () => {
    it('should handle unauthenticated access to dashboard', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });

    it('should handle unauthenticated access to settings', () => {
      cy.visit('/settings');
      cy.url().should('include', '/login');
    });
  });

  describe('Responsive Design', () => {
    it('should display login page on mobile', () => {
      cy.viewport('iphone-x');
      cy.visit('/login');
      cy.get('form').should('be.visible');
    });

    it('should display register page on mobile', () => {
      cy.viewport('iphone-x');
      cy.visit('/register');
      cy.get('form').should('be.visible');
    });
  });
});
