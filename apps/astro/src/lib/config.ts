/**
 * @file Configuration constants for the FOIA Stream frontend
 * @module config
 */

/**
 * Base URL for all API requests
 * @constant
 * @type {string}
 * @default 'http://localhost:3000/api/v1'
 */
export const API_BASE = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
