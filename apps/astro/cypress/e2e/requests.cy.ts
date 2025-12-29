/**
 * Copyright (c) 2025 Foia Stream
 * Requests Pages E2E Tests
 */

const mockAgencies = [
  {
    id: 'agency-1',
    name: 'Test Agency',
    abbreviation: 'TA',
    jurisdictionLevel: 'federal',
    state: 'DC',
    city: 'Washington',
    county: null,
    foiaEmail: 'foia@test.gov',
    foiaAddress: '123 Test St',
    foiaPortalUrl: null,
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'agency-2',
    name: 'Another Agency',
    abbreviation: 'AA',
    jurisdictionLevel: 'state',
    state: 'CA',
    city: 'Sacramento',
    county: null,
    foiaEmail: null,
    foiaAddress: null,
    foiaPortalUrl: null,
    responseDeadlineDays: 10,
    appealDeadlineDays: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockRequest = {
  id: 'test-request-1',
  userId: 'user-1',
  agencyId: 'agency-1',
  status: 'submitted',
  category: 'other',
  title: 'Test FOIA Request',
  description: 'Requesting public records',
  isPublic: true,
  trackingNumber: 'TRK-001',
  submittedAt: new Date().toISOString(),
  acknowledgedAt: null,
  dueDate: null,
  completedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  agency: {
    id: 'agency-1',
    name: 'Test Agency',
    abbreviation: 'TA',
    jurisdictionLevel: 'federal',
  },
};

const mockRequests = [mockRequest];

describe('New Request Page', () => {
  beforeEach(() => {
    cy.on('window:console', (msg) => {
      console.log('[BROWSER CONSOLE]', msg);
    });

    cy.loginMock();

    // Override agencies mock with data
    cy.intercept('GET', '**/agencies*', {
      statusCode: 200,
      body: { success: true, data: mockAgencies },
    }).as('getAgencies');

    cy.visit('/requests/new');
    cy.wait(['@getAgencies', '@getTemplates', '@getMe']);
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
      cy.get('input[placeholder*="Type to search"]').should('exist');
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

  describe('Form Interactions', () => {
    it('should show validation errors when submitting empty form', () => {
      cy.get('button[type="submit"]').click();
      // Check for the error message container that appears at the top of the form
      cy.contains('Please select an agency').should('be.visible');
    });

    it('should allow filling out the form', () => {
      // Verify agencies are loaded
      cy.get('@getAgencies.all').should('have.length.at.least', 1);

      // Interact with AgencySearch component
      cy.get('input[placeholder*="Type to search"]').type('Test Agency', { delay: 100 });
      // Wait for dropdown to appear
      cy.get('.absolute.z-50').should('be.visible');

      // Debug: Check if text exists anywhere
      cy.get('body').should('contain', 'Test Agency');

      // Try clicking without 'button' selector
      cy.contains('Test Agency').click({ force: true });

      cy.get('input[name="title"]').type('New Test Request');
      cy.get('textarea').type('This is a test request description.');

      cy.get('input[name="title"]').should('have.value', 'New Test Request');
      cy.get('textarea').should('have.value', 'This is a test request description.');
    });

    it('should submit the form successfully', () => {
      cy.intercept('POST', '**/requests', {
        statusCode: 201,
        body: {
          success: true,
          data: mockRequest,
        },
      }).as('createRequest');

      // Fill form
      cy.get('input[placeholder*="Type to search"]').type('Test Agency', { delay: 100 });
      cy.get('.absolute.z-50').should('be.visible');
      cy.contains('Test Agency').click({ force: true });

      cy.get('input[name="title"]').type('New Test Request');
      cy.get('textarea').type('This is a test request description.');

      // Submit
      cy.get('button[type="submit"]').click({ force: true });

      // Verify API call and redirect
      cy.wait('@createRequest');
      // Assuming redirect to dashboard or request detail
      cy.url().should('not.include', '/requests/new');
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
  beforeEach(() => {
    cy.on('window:console', (msg) => {
      console.log('[BROWSER CONSOLE]', msg);
    });

    cy.loginMock();

    // Mock requests list for dashboard
    cy.intercept('GET', '**/requests*', {
      statusCode: 200,
      body: { success: true, data: mockRequests },
    }).as('getRequests');

    // Mock specific request
    cy.intercept('GET', '**/api/v1/requests/test-request-1', (req) => {
      req.reply({
        statusCode: 200,
        body: { success: true, data: JSON.parse(JSON.stringify(mockRequest)) },
      });
    }).as('getRequest');
  });

  describe('Navigation from Dashboard', () => {
    it('should navigate to request detail when clicking a request', () => {
      cy.visit('/dashboard');
      cy.wait(500);

      // Debug: Check if dashboard loaded
      cy.get('body').should('contain', 'Your Requests');
      // Check if requests are loaded
      cy.wait('@getRequests');
      cy.get('body').then(($body) => {
        if ($body.text().includes('No requests found')) {
          throw new Error('Dashboard shows No requests found');
        }
      });

      // Click on the request link
      cy.contains('Test FOIA Request').click();

      // Should navigate to request detail page
      cy.url().should('include', '/requests/');
    });
  });

  describe('Content Verification', () => {
    beforeEach(() => {
      cy.visit('/dashboard');
      cy.wait(500);
      cy.contains('Test FOIA Request').click();
      cy.wait('@getRequest');
    });

    it('should display request details correctly', () => {
      cy.get('h1').should('exist');
      cy.contains('Test FOIA Request').should('be.visible');
      cy.contains('submitted').should('be.visible');
      cy.contains('Test Agency').should('be.visible');
    });

    it('should show timeline/history', () => {
      cy.contains('Timeline').should('be.visible');
      cy.contains('Created').should('be.visible');
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
