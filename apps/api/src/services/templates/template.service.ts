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
 * @file Request Templates Service
 * @module services/template
 * @author FOIA Stream Team
 * @description Manages FOIA request templates including official templates,
 *              user-created templates, search functionality, and template seeding.
 *              Templates help users create effective FOIA requests.
 */

// ============================================
// FOIA Stream - Request Templates Service
// ============================================

import { db, schema } from '@/db';
import type { JurisdictionLevel, PaginatedResult, RecordCategory, RequestTemplate } from '@/types';
import { and, eq, like, sql } from 'drizzle-orm';
import { Schema as S } from 'effect';
import { nanoid } from 'nanoid';

/**
 * Data transfer object schema for creating a template
 * @schema
 */
export const CreateTemplateDTOSchema = S.Struct({
  /** Template name/title */
  name: S.String,
  /** Record category this template is for */
  category: S.String as S.Schema<RecordCategory>,
  /** Brief description of the template's purpose */
  description: S.String,
  /** Full template text with placeholders */
  templateText: S.String,
  /** Jurisdiction level this applies to */
  jurisdictionLevel: S.optional(S.String as S.Schema<JurisdictionLevel>),
  /** Whether this is an official/verified template */
  isOfficial: S.optional(S.Boolean),
});
export type CreateTemplateDTO = typeof CreateTemplateDTOSchema.Type;

/**
 * Pre-built request templates for common FOIA requests
 *
 * @constant
 * @description Default templates covering common FOIA request types including
 *              body camera footage, use of force reports, arrest records, etc.
 */
export const DEFAULT_TEMPLATES: Omit<CreateTemplateDTO, 'isOfficial'>[] = [
  {
    name: 'Body Camera Footage Request',
    category: 'body_cam_footage',
    description: 'Request body-worn camera footage from a specific incident',
    templateText: `Pursuant to the Freedom of Information Act (5 U.S.C. § 552) [or applicable state public records law], I hereby request copies of the following records:

All body-worn camera (BWC) footage from [AGENCY NAME] officers who responded to or were present at the incident that occurred on [DATE] at approximately [TIME] at or near [LOCATION/ADDRESS].

This request includes, but is not limited to:
- All BWC footage from the initial response through the conclusion of the incident
- Any footage showing interactions with individuals at the scene
- Audio recordings captured by the BWC devices

I am willing to pay reasonable fees for the processing of this request up to $[AMOUNT]. Please notify me if the estimated fees will exceed this amount.

If any portion of this request is denied, please cite the specific exemption(s) that justify the denial and notify me of any appeal procedures available.

I request that responsive records be provided in digital format (preferred: MP4 or original format) via [email/secure download link/physical media].

Thank you for your prompt attention to this request.`,
  },
  {
    name: 'Use of Force Report Request',
    category: 'use_of_force_report',
    description: 'Request use of force incident reports and related documentation',
    templateText: `Pursuant to the Freedom of Information Act (5 U.S.C. § 552) [or applicable state public records law], I hereby request copies of the following records:

All use of force reports, incident reports, and related documentation concerning the incident that occurred on [DATE] at [LOCATION/ADDRESS] involving [OFFICER NAME(S) if known / "officers of your department"].

This request includes:
1. The official use of force report form(s)
2. Supplemental reports from officers involved
3. Supervisor review and approval documents
4. Any witness statements collected
5. Medical reports related to injuries sustained
6. Internal affairs investigation reports (if applicable)
7. Any photographs or diagrams related to the incident

I am willing to pay reasonable fees for the processing of this request up to $[AMOUNT].

If any portion is denied, please provide the specific legal basis for the denial and information about the appeal process.`,
  },
  {
    name: 'Arrest Records Request',
    category: 'arrest_record',
    description: 'Request arrest reports and booking information',
    templateText: `Pursuant to the Freedom of Information Act (5 U.S.C. § 552) [or applicable state public records law], I hereby request copies of the following records:

All arrest reports, booking records, and related documentation for the arrest of [NAME OF ARRESTEE] that occurred on or about [DATE] in [CITY/COUNTY].

This request includes:
1. The arrest report and any supplemental reports
2. Booking information and mugshot (if public record)
3. Probable cause statement
4. Property inventory
5. Any citations or charges filed

[If requesting your own records: I am the subject of these records and am entitled to access under applicable privacy laws. I have attached a copy of my government-issued ID for verification.]

I am willing to pay reasonable fees up to $[AMOUNT]. Please contact me if fees will exceed this amount.`,
  },
  {
    name: 'Police Policy and Procedure Manual',
    category: 'policy_document',
    description: 'Request department policies and standard operating procedures',
    templateText: `Pursuant to the Freedom of Information Act (5 U.S.C. § 552) [or applicable state public records law], I hereby request copies of the following records:

The complete and current version of [AGENCY NAME]'s policies and procedures manual, including but not limited to:

1. Use of force policy
2. De-escalation procedures
3. Pursuit policy
4. Body-worn camera policy
5. Citizen complaint procedures
6. Code of conduct and ethics
7. Search and seizure procedures
8. Arrest procedures
9. Evidence handling procedures
10. Training requirements

Alternatively, if the complete manual is not available, please provide the specific policies listed above.

I am willing to pay reasonable duplication fees. Please provide these records in electronic format if available.`,
  },
  {
    name: 'Department Budget Request',
    category: 'budget_record',
    description: 'Request law enforcement agency budget and expenditure records',
    templateText: `Pursuant to the Freedom of Information Act (5 U.S.C. § 552) [or applicable state public records law], I hereby request copies of the following records:

Budget and financial records for [AGENCY NAME] for fiscal year(s) [YEAR(S)], including:

1. Approved annual budget broken down by category/line item
2. Actual expenditures by category
3. Overtime costs and details
4. Equipment purchases over $[AMOUNT]
5. Federal grants received and their designated purposes
6. Settlement payments or judgments paid
7. Training expenditures
8. Vehicle fleet costs

Please provide records in spreadsheet format (Excel/CSV) if available.

I am willing to pay reasonable fees up to $[AMOUNT].`,
  },
  {
    name: 'Complaint Records Request',
    category: 'complaint_record',
    description: 'Request citizen complaint records against officers',
    templateText: `Pursuant to the Freedom of Information Act (5 U.S.C. § 552) [or applicable state public records law], I hereby request copies of the following records:

All citizen complaint records filed against [OFFICER NAME / "officers of your department"] during the period [START DATE] to [END DATE].

For each complaint, I request:
1. The nature of the complaint (redacted as necessary to protect complainant identity)
2. Date the complaint was filed
3. The finding/disposition (sustained, not sustained, exonerated, unfounded)
4. Any disciplinary action taken
5. Summary statistics of complaints by type and disposition

I understand that certain identifying information may be redacted to protect privacy. I request that you provide all information that can be legally disclosed.

If any portion is exempt from disclosure, please provide the legal basis and segregate exempt from non-exempt material.`,
  },
  {
    name: 'Contract and Vendor Records',
    category: 'contract',
    description: 'Request contracts with vendors and service providers',
    templateText: `Pursuant to the Freedom of Information Act (5 U.S.C. § 552) [or applicable state public records law], I hereby request copies of the following records:

All contracts, agreements, and related procurement documents between [AGENCY NAME] and [VENDOR NAME / "vendors providing [TYPE OF SERVICE]"] for the period [START DATE] to [END DATE].

This request includes:
1. The complete contract or agreement
2. Any amendments or modifications
3. Bid documents and proposals (if applicable)
4. Invoices and payment records
5. Performance evaluations or reports
6. Correspondence related to the contract

I am particularly interested in contracts for:
- [Specific technology, equipment, or service]
- [e.g., surveillance equipment, software, training services]

Please provide records in their original electronic format if available.`,
  },
  {
    name: 'Training Records Request',
    category: 'training_material',
    description: 'Request officer training materials and curricula',
    templateText: `Pursuant to the Freedom of Information Act (5 U.S.C. § 552) [or applicable state public records law], I hereby request copies of the following records:

Training materials, curricula, and related records from [AGENCY NAME] concerning:

1. Use of force training materials and lesson plans
2. De-escalation training curriculum
3. Bias-free policing / implicit bias training
4. Crisis intervention training (CIT)
5. Body-worn camera training
6. Constitutional policing / civil rights training
7. Training attendance and completion records (aggregate/statistical)
8. Training vendor contracts and certifications

I request both the training materials themselves and any documentation showing when and how often this training is provided to officers.

I am willing to pay reasonable fees up to $[AMOUNT].`,
  },
];

export class TemplateService {
  /**
   * Create a new template
   */
  async createTemplate(userId: string, data: CreateTemplateDTO): Promise<RequestTemplate> {
    const id = nanoid();
    const now = new Date().toISOString();

    await db.insert(schema.requestTemplates).values({
      id,
      name: data.name,
      category: data.category,
      description: data.description,
      templateText: data.templateText,
      jurisdictionLevel: data.jurisdictionLevel,
      createdBy: userId,
      isOfficial: data.isOfficial ?? false,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return this.getTemplateById(id) as Promise<RequestTemplate>;
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<RequestTemplate | null> {
    const template = await db
      .select()
      .from(schema.requestTemplates)
      .where(eq(schema.requestTemplates.id, id))
      .get();

    return template as RequestTemplate | null;
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: RecordCategory): Promise<RequestTemplate[]> {
    const templates = await db
      .select()
      .from(schema.requestTemplates)
      .where(eq(schema.requestTemplates.category, category))
      .orderBy(schema.requestTemplates.usageCount);

    return templates as RequestTemplate[];
  }

  /**
   * Search templates
   */
  async searchTemplates(
    query?: string,
    category?: RecordCategory,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResult<RequestTemplate>> {
    const offset = (page - 1) * pageSize;
    const conditions = [];

    if (query) {
      conditions.push(like(schema.requestTemplates.name, `%${query}%`));
    }

    if (category) {
      conditions.push(eq(schema.requestTemplates.category, category));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [templates, countResult] = await Promise.all([
      db
        .select()
        .from(schema.requestTemplates)
        .where(whereClause)
        .orderBy(schema.requestTemplates.usageCount)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.requestTemplates)
        .where(whereClause)
        .get(),
    ]);

    const totalItems = countResult?.count ?? 0;

    return {
      data: templates as RequestTemplate[],
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  /**
   * Get official templates
   */
  async getOfficialTemplates(): Promise<RequestTemplate[]> {
    const templates = await db
      .select()
      .from(schema.requestTemplates)
      .where(eq(schema.requestTemplates.isOfficial, true))
      .orderBy(schema.requestTemplates.category);

    return templates as RequestTemplate[];
  }

  /**
   * Seed default templates into database
   */
  async seedDefaultTemplates(): Promise<void> {
    const existing = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.requestTemplates)
      .where(eq(schema.requestTemplates.isOfficial, true))
      .get();

    if (existing && existing.count > 0) {
      console.log('Default templates already exist, skipping seed');
      return;
    }

    console.log('Seeding default request templates...');

    for (const template of DEFAULT_TEMPLATES) {
      await db.insert(schema.requestTemplates).values({
        id: nanoid(),
        name: template.name,
        category: template.category,
        description: template.description,
        templateText: template.templateText,
        jurisdictionLevel: template.jurisdictionLevel,
        createdBy: null,
        isOfficial: true,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    console.log(`Seeded ${DEFAULT_TEMPLATES.length} default templates`);
  }
}

export const templateService = new TemplateService();
