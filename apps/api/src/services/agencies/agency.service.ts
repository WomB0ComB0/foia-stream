/**
 * Copyright (c) 2025 Foia Stream
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * @file Agency Service
 * @module services/agency
 * @author FOIA Stream Team
 * @description Handles government agency management including CRUD operations,
 *              search functionality, and agency statistics retrieval.
 *              Supports federal, state, and local jurisdiction levels.
 */

// ============================================
// FOIA Stream - Agency Service
// ============================================

import { and, eq, like, or, sql } from 'drizzle-orm';
import { Schema as S } from 'effect';
import { nanoid } from 'nanoid';

import { db, schema } from '@/db';
import type { Agency, JurisdictionLevel, PaginatedResult } from '@/types';

/**
 * Data transfer object schema for creating a new agency
 * @schema
 */
export const CreateAgencyDTOSchema = S.Struct({
  /** Official agency name */
  name: S.String,
  /** Common abbreviation (e.g., FBI, DOJ) */
  abbreviation: S.optional(S.String),
  /** Jurisdiction level (federal, state, local) */
  jurisdictionLevel: S.String as S.Schema<JurisdictionLevel>,
  /** State code for state/local agencies */
  state: S.optional(S.String),
  /** City name for local agencies */
  city: S.optional(S.String),
  /** County name for county agencies */
  county: S.optional(S.String),
  /** Email address for FOIA requests */
  foiaEmail: S.optional(S.String),
  /** Mailing address for FOIA requests */
  foiaAddress: S.optional(S.String),
  /** URL of online FOIA portal */
  foiaPortalUrl: S.optional(S.String),
  /** Days allowed for initial response */
  responseDeadlineDays: S.optional(S.Number),
  /** Days allowed to file appeal */
  appealDeadlineDays: S.optional(S.Number),
});
export type CreateAgencyDTO = typeof CreateAgencyDTOSchema.Type;

/**
 * Filters schema for agency search
 * @schema
 */
export const AgencySearchFiltersSchema = S.Struct({
  /** Text search query for name/abbreviation */
  query: S.optional(S.String),
  /** Filter by jurisdiction level */
  jurisdictionLevel: S.optional(S.String as S.Schema<JurisdictionLevel>),
  /** Filter by state code */
  state: S.optional(S.String),
});
export type AgencySearchFilters = typeof AgencySearchFiltersSchema.Type;
/**
 * Agency Service
 *
 * @class AgencyService
 * @description Manages government agencies that can receive FOIA requests.
 *              Provides search, CRUD operations, and statistics aggregation.
 *
 * @example
 * ```typescript
 * const agencyService = new AgencyService();
 *
 * // Search for FBI
 * const { data, pagination } = await agencyService.searchAgencies({
 *   query: 'FBI',
 *   jurisdictionLevel: 'federal'
 * });
 * ```
 */
export class AgencyService {
  /**
   * Create a new agency
   *
   * @param {CreateAgencyDTO} data - Agency data
   * @returns {Promise<Agency>} Created agency
   */
  async createAgency(data: CreateAgencyDTO): Promise<Agency> {
    const id = nanoid();
    const now = new Date();

    await db.insert(schema.agencies).values({
      id,
      name: data.name,
      abbreviation: data.abbreviation,
      jurisdictionLevel: data.jurisdictionLevel,
      state: data.state,
      city: data.city,
      county: data.county,
      foiaEmail: data.foiaEmail,
      foiaAddress: data.foiaAddress,
      foiaPortalUrl: data.foiaPortalUrl,
      responseDeadlineDays: data.responseDeadlineDays ?? 20,
      appealDeadlineDays: data.appealDeadlineDays ?? 30,
      createdAt: now,
      updatedAt: now,
    });

    return this.getAgencyById(id) as Promise<Agency>;
  }

  /**
   * Get agency by ID
   */
  async getAgencyById(id: string): Promise<Agency | null> {
    const agencies = await db.select().from(schema.agencies).where(eq(schema.agencies.id, id));

    return (agencies[0] as Agency) ?? null;
  }

  /**
   * Search agencies
   */
  async searchAgencies(
    filters: AgencySearchFilters,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResult<Agency>> {
    const offset = (page - 1) * pageSize;
    const conditions = [];

    if (filters.query) {
      conditions.push(
        or(
          like(schema.agencies.name, `%${filters.query}%`),
          like(schema.agencies.abbreviation, `%${filters.query}%`),
        ),
      );
    }

    if (filters.jurisdictionLevel) {
      conditions.push(eq(schema.agencies.jurisdictionLevel, filters.jurisdictionLevel));
    }

    if (filters.state) {
      conditions.push(eq(schema.agencies.state, filters.state));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [agencies, countResult] = await Promise.all([
      db
        .select()
        .from(schema.agencies)
        .where(whereClause)
        .orderBy(schema.agencies.name)
        .limit(pageSize)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(schema.agencies).where(whereClause),
    ]);

    const totalItems = countResult[0]?.count ?? 0;

    return {
      data: agencies as Agency[],
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  /**
   * Get agencies by jurisdiction level
   */
  async getAgenciesByJurisdiction(
    jurisdictionLevel: JurisdictionLevel,
    state?: string,
  ): Promise<Agency[]> {
    const conditions = [eq(schema.agencies.jurisdictionLevel, jurisdictionLevel)];

    if (state) {
      conditions.push(eq(schema.agencies.state, state));
    }

    const agencies = await db
      .select()
      .from(schema.agencies)
      .where(and(...conditions))
      .orderBy(schema.agencies.name);

    return agencies as unknown as Agency[];
  }

  /**
   * Get agency statistics
   */
  async getAgencyStats(agencyId: string) {
    const stats = await db
      .select()
      .from(schema.agencyStats)
      .where(eq(schema.agencyStats.agencyId, agencyId));

    return stats[0] ?? null;
  }

  /**
   * Update agency
   */
  async updateAgency(id: string, data: Partial<CreateAgencyDTO>): Promise<Agency> {
    const now = new Date();

    await db
      .update(schema.agencies)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(schema.agencies.id, id));

    return this.getAgencyById(id) as Promise<Agency>;
  }

  /**
   * Get US states list for filtering
   */
  getUSStates(): { code: string; name: string }[] {
    return [
      { code: 'AL', name: 'Alabama' },
      { code: 'AK', name: 'Alaska' },
      { code: 'AZ', name: 'Arizona' },
      { code: 'AR', name: 'Arkansas' },
      { code: 'CA', name: 'California' },
      { code: 'CO', name: 'Colorado' },
      { code: 'CT', name: 'Connecticut' },
      { code: 'DE', name: 'Delaware' },
      { code: 'FL', name: 'Florida' },
      { code: 'GA', name: 'Georgia' },
      { code: 'HI', name: 'Hawaii' },
      { code: 'ID', name: 'Idaho' },
      { code: 'IL', name: 'Illinois' },
      { code: 'IN', name: 'Indiana' },
      { code: 'IA', name: 'Iowa' },
      { code: 'KS', name: 'Kansas' },
      { code: 'KY', name: 'Kentucky' },
      { code: 'LA', name: 'Louisiana' },
      { code: 'ME', name: 'Maine' },
      { code: 'MD', name: 'Maryland' },
      { code: 'MA', name: 'Massachusetts' },
      { code: 'MI', name: 'Michigan' },
      { code: 'MN', name: 'Minnesota' },
      { code: 'MS', name: 'Mississippi' },
      { code: 'MO', name: 'Missouri' },
      { code: 'MT', name: 'Montana' },
      { code: 'NE', name: 'Nebraska' },
      { code: 'NV', name: 'Nevada' },
      { code: 'NH', name: 'New Hampshire' },
      { code: 'NJ', name: 'New Jersey' },
      { code: 'NM', name: 'New Mexico' },
      { code: 'NY', name: 'New York' },
      { code: 'NC', name: 'North Carolina' },
      { code: 'ND', name: 'North Dakota' },
      { code: 'OH', name: 'Ohio' },
      { code: 'OK', name: 'Oklahoma' },
      { code: 'OR', name: 'Oregon' },
      { code: 'PA', name: 'Pennsylvania' },
      { code: 'RI', name: 'Rhode Island' },
      { code: 'SC', name: 'South Carolina' },
      { code: 'SD', name: 'South Dakota' },
      { code: 'TN', name: 'Tennessee' },
      { code: 'TX', name: 'Texas' },
      { code: 'UT', name: 'Utah' },
      { code: 'VT', name: 'Vermont' },
      { code: 'VA', name: 'Virginia' },
      { code: 'WA', name: 'Washington' },
      { code: 'WV', name: 'West Virginia' },
      { code: 'WI', name: 'Wisconsin' },
      { code: 'WY', name: 'Wyoming' },
      { code: 'DC', name: 'District of Columbia' },
    ];
  }
}

export const agencyService = new AgencyService();
