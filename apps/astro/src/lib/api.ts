/**
 * @file API client for FOIA Stream application
 * @module api
 */

import { API_BASE } from './config';

/**
 * Standard API response wrapper
 * @interface ApiResponse
 * @template T - The type of data returned in the response
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * User account information
 * @interface User
 */
export interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  organization?: string | null;
  isVerified: boolean;
  isAnonymous: boolean;
  createdAt: string;
}

/**
 * Authentication response containing JWT token and user data
 * @interface AuthResponse
 */
export interface AuthResponse {
  token: string;
  user: User;
}

/**
 * Government agency that accepts FOIA requests
 * @interface Agency
 */
export interface Agency {
  id: string;
  name: string;
  abbreviation: string;
  jurisdictionLevel: 'federal' | 'state' | 'local' | 'county';
  state?: string | null;
  city?: string | null;
  county?: string | null;
  foiaEmail?: string | null;
  foiaUrl?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  responseDeadlineDays?: number | null;
  appealDeadlineDays?: number | null;
}

/**
 * FOIA request submitted by a user
 * @interface FoiaRequest
 */
export interface FoiaRequest {
  id: string;
  userId: string;
  agencyId: string;
  title: string;
  description: string;
  category: string;
  status: string;
  dateRange?: string | null;
  specificIndividuals?: string | null;
  submittedAt?: string | null;
  acknowledgedAt?: string | null;
  dueDate?: string | null;
  closedAt?: string | null;
  trackingNumber?: string | null;
  expeditedProcessing: boolean;
  feeWaiverRequested: boolean;
  estimatedFee?: number | null;
  actualFee?: number | null;
  createdAt: string;
  updatedAt: string;
  agency?: Agency;
}

/**
 * Reusable FOIA request template
 * @interface Template
 */
export interface Template {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  content: string;
  variables: string[];
  isPublic: boolean;
}

/**
 * HTTP client for communicating with the FOIA Stream API
 * @class ApiClient
 */
class ApiClient {
  private baseUrl: string;

  /**
   * Creates an instance of ApiClient
   * @param {string} [baseUrl=API_BASE] - The base URL for API requests
   */
  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  /**
   * Gets authorization headers with JWT token if available
   * @private
   * @returns {HeadersInit} Headers object with Authorization if token exists
   */
  private getAuthHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Makes an HTTP request to the API
   * @private
   * @template T - The expected response data type
   * @param {string} endpoint - API endpoint path
   * @param {RequestInit} [options={}] - Fetch options
   * @returns {Promise<ApiResponse<T>>} API response with typed data
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'Request failed',
        };
      }

      return data as ApiResponse<T>;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Registers a new user account
   * @param {Object} data - Registration data
   * @param {string} data.email - User email address
   * @param {string} data.password - User password
   * @param {string} data.firstName - User first name
   * @param {string} data.lastName - User last name
   * @param {string} [data.organization] - Optional organization name
   * @param {string} [data.role] - Optional user role
   * @returns {Promise<ApiResponse<AuthResponse>>} Auth response with token and user
   */
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organization?: string;
    role?: string;
  }): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Authenticates a user and returns a JWT token
   * @param {Object} data - Login credentials
   * @param {string} data.email - User email address
   * @param {string} data.password - User password
   * @returns {Promise<ApiResponse<AuthResponse>>} Auth response with token and user
   */
  async login(data: { email: string; password: string }): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Logs out the current user
   * @returns {Promise<ApiResponse<void>>} Empty response on success
   */
  async logout(): Promise<ApiResponse<void>> {
    return this.request<void>('/auth/logout', {
      method: 'POST',
    });
  }

  /**
   * Gets the current authenticated user's profile
   * @returns {Promise<ApiResponse<User>>} User profile data
   */
  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/me');
  }

  /**
   * Searches for agencies with optional filters
   * @param {Object} [params] - Search parameters
   * @param {number} [params.page] - Page number for pagination
   * @param {number} [params.pageSize] - Number of results per page
   * @param {string} [params.query] - Search query string
   * @param {string} [params.jurisdictionLevel] - Filter by jurisdiction level
   * @param {string} [params.state] - Filter by state code
   * @returns {Promise<ApiResponse<Agency[]>>} List of matching agencies
   */
  async getAgencies(params?: {
    page?: number;
    pageSize?: number;
    query?: string;
    jurisdictionLevel?: string;
    state?: string;
  }): Promise<ApiResponse<Agency[]>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.query) searchParams.set('query', params.query);
    if (params?.jurisdictionLevel) searchParams.set('jurisdictionLevel', params.jurisdictionLevel);
    if (params?.state) searchParams.set('state', params.state);

    const queryStr = searchParams.toString();
    return this.request<Agency[]>(`/agencies${queryStr ? `?${queryStr}` : ''}`);
  }

  /**
   * Gets a single agency by ID
   * @param {string} id - Agency ID
   * @returns {Promise<ApiResponse<Agency>>} Agency data
   */
  async getAgency(id: string): Promise<ApiResponse<Agency>> {
    return this.request<Agency>(`/agencies/${id}`);
  }

  /**
   * Gets list of US states
   * @returns {Promise<ApiResponse<Array<{code: string, name: string}>>>} List of states
   */
  async getStates(): Promise<ApiResponse<{ code: string; name: string }[]>> {
    return this.request<{ code: string; name: string }[]>('/agencies/states');
  }

  /**
   * Searches for FOIA requests with optional filters
   * @param {Object} [params] - Search parameters
   * @param {number} [params.page] - Page number for pagination
   * @param {number} [params.limit] - Number of results per page
   * @param {string} [params.status] - Filter by request status
   * @param {string} [params.agencyId] - Filter by agency ID
   * @param {string} [params.query] - Search query string
   * @returns {Promise<ApiResponse<FoiaRequest[]>>} List of matching requests
   */
  async getRequests(params?: {
    page?: number;
    limit?: number;
    status?: string;
    agencyId?: string;
    query?: string;
  }): Promise<ApiResponse<FoiaRequest[]>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.agencyId) searchParams.set('agencyId', params.agencyId);
    if (params?.query) searchParams.set('query', params.query);

    const query = searchParams.toString();
    return this.request<FoiaRequest[]>(`/requests${query ? `?${query}` : ''}`);
  }

  /**
   * Gets a single FOIA request by ID
   * @param {string} id - Request ID
   * @returns {Promise<ApiResponse<FoiaRequest>>} Request data
   */
  async getRequest(id: string): Promise<ApiResponse<FoiaRequest>> {
    return this.request<FoiaRequest>(`/requests/${id}`);
  }

  /**
   * Creates a new FOIA request
   * @param {Object} data - Request data
   * @param {string} data.agencyId - Target agency ID
   * @param {string} data.title - Request title
   * @param {string} data.description - Detailed request description
   * @param {string} data.category - Request category
   * @param {string} [data.dateRange] - Optional date range for records
   * @param {string} [data.specificIndividuals] - Optional names of specific individuals
   * @param {boolean} [data.expeditedProcessing] - Request expedited processing
   * @param {boolean} [data.feeWaiverRequested] - Request fee waiver
   * @returns {Promise<ApiResponse<FoiaRequest>>} Created request data
   */
  async createRequest(data: {
    agencyId: string;
    title: string;
    description: string;
    category: string;
    dateRange?: string;
    specificIndividuals?: string;
    expeditedProcessing?: boolean;
    feeWaiverRequested?: boolean;
  }): Promise<ApiResponse<FoiaRequest>> {
    return this.request<FoiaRequest>('/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Updates an existing FOIA request
   * @param {string} id - Request ID to update
   * @param {Object} data - Fields to update
   * @param {string} [data.title] - Updated title
   * @param {string} [data.description] - Updated description
   * @param {string} [data.status] - Updated status
   * @returns {Promise<ApiResponse<FoiaRequest>>} Updated request data
   */
  async updateRequest(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      status: string;
    }>,
  ): Promise<ApiResponse<FoiaRequest>> {
    return this.request<FoiaRequest>(`/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Searches for templates with optional category filter
   * @param {Object} [params] - Search parameters
   * @param {string} [params.category] - Filter by category
   * @returns {Promise<ApiResponse<Template[]>>} List of matching templates
   */
  async getTemplates(params?: { category?: string }): Promise<ApiResponse<Template[]>> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);

    const query = searchParams.toString();
    return this.request<Template[]>(`/templates${query ? `?${query}` : ''}`);
  }

  /**
   * Gets a single template by ID
   * @param {string} id - Template ID
   * @returns {Promise<ApiResponse<Template>>} Template data
   */
  async getTemplate(id: string): Promise<ApiResponse<Template>> {
    return this.request<Template>(`/templates/${id}`);
  }
}

/**
 * Singleton API client instance
 * @constant
 * @type {ApiClient}
 */
export const api = new ApiClient();
