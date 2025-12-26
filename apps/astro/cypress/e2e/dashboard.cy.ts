/**
 * Copyright (c) 2025 Foia Stream
 * Dashboard E2E Tests
 */

describe('Dashboard', () => {
  beforeEach(() => {
    cy.loginMock();
    cy.visit('/dashboard');
    // Wait for React hydration
    cy.wait(500);
  });

  describe('Page Loading', () => {
    it('should load the dashboard page', () => {
      cy.url().should('include', '/dashboard');
    });

    it('should display welcome message with user name', () => {
      cy.contains(/Welcome back/i).should('be.visible');
    });

    it('should have FOIAStream logo/branding', () => {
      cy.contains('FOIAStream').should('exist');
    });
  });

  describe('Navigation', () => {
    it('should have main navigation links', () => {
      cy.contains('Dashboard').should('exist');
      cy.contains('Agencies').should('exist');
      cy.contains('Templates').should('exist');
    });

    it('should have user menu button', () => {
      cy.get('button')
        .contains(/Test|User/i)
        .should('exist');
    });
  });

  describe('Statistics Cards', () => {
    it('should display Total Requests stat', () => {
      cy.contains('Total Requests').should('be.visible');
    });

    it('should display In Progress stat', () => {
      cy.contains('In Progress').should('be.visible');
    });

    it('should display Completed stat', () => {
      cy.contains('Completed').should('be.visible');
    });

    it('should display Agencies stat', () => {
      cy.contains('Agencies').should('be.visible');
    });
  });

  describe('Requests Section', () => {
    it('should display Your Requests section', () => {
      cy.contains('Your Requests').should('be.visible');
    });

    it('should have New Request button', () => {
      cy.contains('New Request').should('be.visible');
    });

    it('should have refresh button', () => {
      cy.get('button[title="Refresh"]').should('exist');
    });

    it('should show empty state when no requests', () => {
      cy.contains(/No requests yet|Create your first/i).should('be.visible');
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt layout for mobile', () => {
      cy.viewport('iphone-x');
      cy.get('body').should('be.visible');
      cy.contains(/Welcome/i).should('be.visible');
    });

    it('should adapt layout for tablet', () => {
      cy.viewport('ipad-2');
      cy.get('body').should('be.visible');
      cy.contains('Your Requests').should('be.visible');
    });
  });
});

describe('Dashboard with Requests', () => {
  const mockRequests = [
    {
      id: 'req-1',
      userId: 'user-1',
      agencyId: 'agency-1',
      templateId: null,
      title: 'Test FOIA Request 1',
      subject: 'Test Subject',
      description: 'Test description',
      requestBody: 'Request body content',
      status: 'submitted',
      referenceNumber: null,
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

    // Override requests with mock data
    cy.intercept('GET', '**/requests*', {
      statusCode: 200,
      body: mockRequests,
    }).as('getRequests');

    cy.visit('/dashboard');
    cy.wait(500);
  });

  it('should display request items when requests exist', () => {
    cy.contains('Test FOIA Request 1').should('be.visible');
  });

  it('should show request status badge', () => {
    cy.contains('submitted').should('be.visible');
  });

  it('should have Select All button when requests exist', () => {
    cy.contains(/Select All/i).should('exist');
  });
});
