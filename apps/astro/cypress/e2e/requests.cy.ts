/**
 * Copyright (c) 2025 Foia Stream
 * Requests Pages E2E Tests
 */

describe('New Request Page', () => {
  beforeEach(() => {
    cy.loginMock();
    cy.visit('/requests/new');
    cy.wait(500);
  });

  describe('Page Loading', () => {
    it('should load the new request page', () => {
      cy.url().should('include', '/requests/new');
    });

    it('should display page header', () => {
      cy.contains(/New|Request|FOIA/i).should('be.visible');
    });
  });

  describe('Form Elements', () => {
    it('should have agency selection', () => {
      cy.get('select, [role="combobox"], input[placeholder*="agency" i]').first().should('exist');
    });

    it('should have subject/title field', () => {
      cy.get(
        'input[name="subject"], input[name="title"], input[placeholder*="subject" i], input[placeholder*="title" i]',
      )
        .first()
        .should('exist');
    });

    it('should have request body/description textarea', () => {
      cy.get('textarea').first().should('exist');
    });

    it('should have submit button', () => {
      cy.get('button[type="submit"], button:contains("Submit"), button:contains("Create")')
        .first()
        .should('exist');
    });
  });

  describe('Navigation', () => {
    it('should have back/cancel link', () => {
      cy.get('a[href="/dashboard"], button:contains("Cancel"), a:contains("Back")')
        .first()
        .should('exist');
    });
  });

  describe('Responsive Design', () => {
    it('should work on mobile', () => {
      cy.viewport('iphone-x');
      cy.get('body').should('be.visible');
      cy.get('textarea').should('be.visible');
    });

    it('should work on tablet', () => {
      cy.viewport('ipad-2');
      cy.get('body').should('be.visible');
    });
  });
});

describe('Request Detail Page', () => {
  // Use mocked requests and navigate via dashboard link
  const mockRequests = [
    {
      id: 'test-request-1',
      userId: 'user-1',
      agencyId: 'agency-1',
      templateId: null,
      title: 'Test FOIA Request',
      subject: 'Public Records Request',
      description: 'Requesting public records',
      requestBody: 'I am requesting all documents related to...',
      status: 'submitted',
      referenceNumber: 'REF-2024-001',
      trackingNumber: 'TRK-001',
      submittedAt: new Date().toISOString(),
      acknowledgedAt: null,
      dueDate: null,
      completedAt: null,
      responseDeadline: null,
      fees: null,
      estimatedFee: null,
      actualFee: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    cy.loginMock();

    // Mock requests list for dashboard
    cy.intercept('GET', '**/requests*', {
      statusCode: 200,
      body: mockRequests,
    }).as('getRequests');
  });

  describe('Navigation from Dashboard', () => {
    it('should navigate to request detail when clicking a request', () => {
      cy.visit('/dashboard');
      cy.wait(500);

      // Click on the request link
      cy.contains('Test FOIA Request').click();

      // Should navigate to request detail page
      cy.url().should('include', '/requests/');
    });
  });

  describe('Responsive Design', () => {
    it('should work on mobile when navigating from dashboard', () => {
      cy.viewport('iphone-x');
      cy.visit('/dashboard');
      cy.wait(500);

      // Click on the request link
      cy.contains('Test FOIA Request').click();
      cy.get('body').should('be.visible');
    });
  });
});
