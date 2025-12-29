/**
 * Copyright (c) 2025 Foia Stream
 */

/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login with email and password
       */
      login(email: string, password: string): Chainable<void>;

      /**
       * Mock authentication for protected routes (sets up API intercepts + localStorage)
       */
      loginMock(): Chainable<void>;

      /**
       * Register a new user
       */
      register(userData: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
      }): Chainable<void>;

      /**
       * Logout the current user
       */
      logout(): Chainable<void>;

      /**
       * Get element by data-testid attribute
       */
      getByTestId(testId: string): Chainable<JQuery<HTMLElement>>;

      /**
       * Mock API response
       */
      mockApi(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        url: string,
        response: object,
        statusCode?: number,
      ): Chainable<void>;
    }
  }
}

// Custom command: Login
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('input[name="email"], input[type="email"]').type(email);
  cy.get('input[name="password"], input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
  // Wait for redirect or dashboard element
  cy.url().should('not.include', '/login');
});

// Custom command: Mock authentication for protected routes
Cypress.Commands.add('loginMock', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'civilian',
    firstName: 'Test',
    lastName: 'User',
    organization: null,
    isVerified: true,
    isAnonymous: false,
    createdAt: new Date().toISOString(),
  };

  // Mock the profile endpoint that verifies authentication
  cy.intercept('GET', '**/api/v1/auth/profile', {
    statusCode: 200,
    body: { success: true, data: mockUser },
  }).as('getProfile');

  // Mock the /auth/me endpoint (used by the app to verify authentication)
  cy.intercept('GET', '**/api/v1/auth/me', {
    statusCode: 200,
    body: { success: true, data: mockUser },
  }).as('getMe');

  // Mock common API endpoints (using API envelope format)
  cy.intercept('GET', '**/api/v1/requests*', {
    statusCode: 200,
    body: { success: true, data: [] },
  }).as('getRequests');

  cy.intercept('GET', '**/api/v1/agencies*', {
    statusCode: 200,
    body: { success: true, data: [] },
  }).as('getAgencies');

  cy.intercept('GET', '**/api/v1/templates*', {
    statusCode: 200,
    body: { success: true, data: [] },
  }).as('getTemplates');

  // Set the auth token in localStorage
  cy.window().then((win) => {
    win.localStorage.setItem('auth_token', 'mock-jwt-token-for-testing');
    win.localStorage.setItem('token', 'mock-jwt-token-for-testing');
  });
});

// Custom command: Register
Cypress.Commands.add(
  'register',
  (userData: { email: string; password: string; firstName: string; lastName: string }) => {
    cy.visit('/register');
    cy.get('input[name="email"]').type(userData.email);
    cy.get('input[name="firstName"]').type(userData.firstName);
    cy.get('input[name="lastName"]').type(userData.lastName);
    cy.get('input[name="password"]').type(userData.password);
    cy.get('button[type="submit"]').click();
  },
);

// Custom command: Logout
Cypress.Commands.add('logout', () => {
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.visit('/');
});

// Custom command: Get by test ID
Cypress.Commands.add('getByTestId', (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`);
});

// Custom command: Mock API
Cypress.Commands.add(
  'mockApi',
  (
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    url: string,
    response: object,
    statusCode = 200,
  ) => {
    cy.intercept(method, url, {
      statusCode,
      body: response,
    }).as(url.replace(/\//g, '_').replace(/^_/, ''));
  },
);

export {};
