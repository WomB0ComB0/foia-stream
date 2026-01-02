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
 * @file Agency seed data for FOIA Stream database
 * @module db/seed-agencies
 * @description Seeds the database with real FOIA-accepting agencies from federal, state, and local jurisdictions.
 * Data sources include FOIA.gov, USA.gov, and manually curated state/local agencies.
 * @example
 * ```bash
 * bun run seed:agencies
 * ```
 */

import { nanoid } from 'nanoid';
import { db, schema, sqlite } from './index';
import fs from 'fs';
import path from 'path';

/**
 * Agency seed data structure
 * @interface AgencySeed
 */
interface AgencySeed {
  name: string;
  abbreviation?: string;
  jurisdictionLevel: 'federal' | 'state' | 'local' | 'county';
  state?: string;
  city?: string;
  county?: string;
  foiaEmail?: string;
  foiaAddress?: string;
  foiaPortalUrl?: string;
  responseDeadlineDays?: number;
  appealDeadlineDays?: number;
}

/** Federal agency seed data from FOIA.gov / USA.gov */
const federalAgencies: AgencySeed[] = [
  {
    name: 'Department of Justice',
    abbreviation: 'DOJ',
    jurisdictionLevel: 'federal',
    foiaEmail: 'MRUFOIA.Requests@usdoj.gov',
    foiaPortalUrl: 'https://www.justice.gov/oip/submit-and-track-request-or-appeal',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Federal Bureau of Investigation',
    abbreviation: 'FBI',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://vault.fbi.gov/fdps-1/',
    foiaEmail: 'foiparequest@fbi.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Department of Homeland Security',
    abbreviation: 'DHS',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.dhs.gov/foia-contact-information',
    foiaEmail: 'foia@hq.dhs.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'U.S. Customs and Border Protection',
    abbreviation: 'CBP',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.cbp.gov/site-policy-notices/foia',
    foiaEmail: 'CBPFOIAPublicLiaison@cbp.dhs.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'U.S. Immigration and Customs Enforcement',
    abbreviation: 'ICE',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.ice.gov/foia',
    foiaEmail: 'ice-foia@dhs.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Department of Defense',
    abbreviation: 'DOD',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.esd.whs.mil/FOID/',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Department of State',
    abbreviation: 'DOS',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://foia.state.gov/',
    foiaEmail: 'FOIARequest@state.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Department of the Treasury',
    abbreviation: 'Treasury',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://home.treasury.gov/footer/freedom-of-information-act',
    foiaEmail: 'treasfoia@treasury.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Internal Revenue Service',
    abbreviation: 'IRS',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.irs.gov/privacy-disclosure/irs-freedom-of-information',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Department of Health and Human Services',
    abbreviation: 'HHS',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.hhs.gov/foia/index.html',
    foiaEmail: 'FOIARequest@hhs.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Centers for Disease Control and Prevention',
    abbreviation: 'CDC',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.cdc.gov/od/foia/index.htm',
    foiaEmail: 'FOIARequests@cdc.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Food and Drug Administration',
    abbreviation: 'FDA',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.fda.gov/regulatory-information/freedom-information',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Department of Education',
    abbreviation: 'ED',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www2.ed.gov/policy/gen/leg/foia/foiatoc.html',
    foiaEmail: 'EDFOIAManager@ed.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Department of Veterans Affairs',
    abbreviation: 'VA',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.va.gov/foia/',
    foiaEmail: 'vaborfoiapublicliaisonofficer@va.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Department of Labor',
    abbreviation: 'DOL',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.dol.gov/general/foia',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Environmental Protection Agency',
    abbreviation: 'EPA',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.epa.gov/foia',
    foiaEmail: 'hq.foia@epa.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Department of Energy',
    abbreviation: 'DOE',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.energy.gov/management/freedom-information-act-program',
    foiaEmail: 'FOIA-Central@hq.doe.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Department of Transportation',
    abbreviation: 'DOT',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.transportation.gov/foia',
    foiaEmail: 'foia@dot.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Federal Aviation Administration',
    abbreviation: 'FAA',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.faa.gov/foia/',
    foiaEmail: '9-AWA-ARC-FOIA@faa.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Department of Housing and Urban Development',
    abbreviation: 'HUD',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.hud.gov/program_offices/administration/foia',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Department of Agriculture',
    abbreviation: 'USDA',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.usda.gov/ogc/office-information-affairs/foia-division',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Department of the Interior',
    abbreviation: 'DOI',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.doi.gov/foia',
    foiaEmail: 'foia@ios.doi.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Department of Commerce',
    abbreviation: 'DOC',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.commerce.gov/foia',
    foiaEmail: 'eFOIA@doc.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Central Intelligence Agency',
    abbreviation: 'CIA',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.cia.gov/readingroom/foia-request',
    responseDeadlineDays: 20,
    appealDeadlineDays: 45,
  },
  {
    name: 'National Security Agency',
    abbreviation: 'NSA',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.nsa.gov/about/civil-liberties-privacy-office/foia/',
    foiaEmail: 'nsafoia@nsa.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'National Aeronautics and Space Administration',
    abbreviation: 'NASA',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.nasa.gov/foia/',
    foiaEmail: 'hq-foia@nasa.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Social Security Administration',
    abbreviation: 'SSA',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.ssa.gov/foia/',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Securities and Exchange Commission',
    abbreviation: 'SEC',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.sec.gov/page/office-foia-services',
    foiaEmail: 'foiapa@sec.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Federal Trade Commission',
    abbreviation: 'FTC',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.ftc.gov/about-ftc/foia',
    foiaEmail: 'foia@ftc.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Federal Communications Commission',
    abbreviation: 'FCC',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.fcc.gov/general/freedom-information-act-foia',
    foiaEmail: 'foia@fcc.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Consumer Financial Protection Bureau',
    abbreviation: 'CFPB',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.consumerfinance.gov/foia/',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'National Archives and Records Administration',
    abbreviation: 'NARA',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.archives.gov/foia',
    foiaEmail: 'foia@nara.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Office of Personnel Management',
    abbreviation: 'OPM',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.opm.gov/information-management/freedom-of-information-act/',
    foiaEmail: 'foia@opm.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Small Business Administration',
    abbreviation: 'SBA',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.sba.gov/about-sba/open-government/foia',
    foiaEmail: 'foia@sba.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'U.S. Postal Service',
    abbreviation: 'USPS',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://about.usps.com/who/legal/foia/',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'National Labor Relations Board',
    abbreviation: 'NLRB',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.nlrb.gov/guidance/freedom-of-information-act-foia',
    foiaEmail: 'FOIABranch@nlrb.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
  {
    name: 'Equal Employment Opportunity Commission',
    abbreviation: 'EEOC',
    jurisdictionLevel: 'federal',
    foiaPortalUrl: 'https://www.eeoc.gov/foia',
    foiaEmail: 'foia@eeoc.gov',
    responseDeadlineDays: 20,
    appealDeadlineDays: 90,
  },
];

/** State agency seed data with varying public records laws by state */
const stateAgencies: AgencySeed[] = [
  {
    name: 'California Department of Justice',
    abbreviation: 'CA DOJ',
    jurisdictionLevel: 'state',
    state: 'CA',
    foiaPortalUrl: 'https://oag.ca.gov/public-records',
    responseDeadlineDays: 10,
    appealDeadlineDays: 30,
  },
  {
    name: 'California Highway Patrol',
    abbreviation: 'CHP',
    jurisdictionLevel: 'state',
    state: 'CA',
    foiaPortalUrl: 'https://www.chp.ca.gov/home/public-records-act',
    responseDeadlineDays: 10,
    appealDeadlineDays: 30,
  },
  {
    name: 'New York State Police',
    abbreviation: 'NYSP',
    jurisdictionLevel: 'state',
    state: 'NY',
    foiaPortalUrl: 'https://troopers.ny.gov/foil',
    responseDeadlineDays: 5,
    appealDeadlineDays: 30,
  },
  {
    name: 'New York Department of State',
    jurisdictionLevel: 'state',
    state: 'NY',
    foiaPortalUrl: 'https://dos.ny.gov/freedom-information-law-foil',
    responseDeadlineDays: 5,
    appealDeadlineDays: 30,
  },
  {
    name: 'Texas Department of Public Safety',
    abbreviation: 'TX DPS',
    jurisdictionLevel: 'state',
    state: 'TX',
    foiaPortalUrl: 'https://www.dps.texas.gov/section/open-records',
    responseDeadlineDays: 10,
    appealDeadlineDays: 30,
  },
  {
    name: 'Texas Attorney General',
    abbreviation: 'TX AG',
    jurisdictionLevel: 'state',
    state: 'TX',
    foiaPortalUrl: 'https://www.texasattorneygeneral.gov/open-government',
    responseDeadlineDays: 10,
    appealDeadlineDays: 30,
  },
  {
    name: 'Florida Department of Law Enforcement',
    abbreviation: 'FDLE',
    jurisdictionLevel: 'state',
    state: 'FL',
    foiaPortalUrl: 'https://www.fdle.state.fl.us/Public-Records-Requests.aspx',
    responseDeadlineDays: 0,
    appealDeadlineDays: 30,
  },
  {
    name: 'Illinois State Police',
    abbreviation: 'ISP',
    jurisdictionLevel: 'state',
    state: 'IL',
    foiaPortalUrl: 'https://isp.illinois.gov/FOIA',
    responseDeadlineDays: 5,
    appealDeadlineDays: 60,
  },
  {
    name: 'Pennsylvania State Police',
    abbreviation: 'PSP',
    jurisdictionLevel: 'state',
    state: 'PA',
    foiaPortalUrl: 'https://www.psp.pa.gov/right-to-know/Pages/default.aspx',
    responseDeadlineDays: 5,
    appealDeadlineDays: 15,
  },
  {
    name: 'Ohio Attorney General',
    abbreviation: 'OH AG',
    jurisdictionLevel: 'state',
    state: 'OH',
    foiaPortalUrl: 'https://www.ohioattorneygeneral.gov/About-AG/Public-Records',
    responseDeadlineDays: 0,
    appealDeadlineDays: 30,
  },
  {
    name: 'Georgia Bureau of Investigation',
    abbreviation: 'GBI',
    jurisdictionLevel: 'state',
    state: 'GA',
    foiaPortalUrl: 'https://gbi.georgia.gov/open-records-request',
    responseDeadlineDays: 3,
    appealDeadlineDays: 30,
  },
  {
    name: 'Arizona Department of Public Safety',
    abbreviation: 'AZ DPS',
    jurisdictionLevel: 'state',
    state: 'AZ',
    foiaPortalUrl: 'https://www.azdps.gov/about/public_records',
    responseDeadlineDays: 0,
    appealDeadlineDays: 30,
  },
  {
    name: 'Washington State Patrol',
    abbreviation: 'WSP',
    jurisdictionLevel: 'state',
    state: 'WA',
    foiaPortalUrl: 'https://www.wsp.wa.gov/public-records/',
    responseDeadlineDays: 5,
    appealDeadlineDays: 30,
  },
  {
    name: 'Massachusetts State Police',
    abbreviation: 'MSP',
    jurisdictionLevel: 'state',
    state: 'MA',
    foiaPortalUrl: 'https://www.mass.gov/orgs/massachusetts-state-police',
    responseDeadlineDays: 10,
    appealDeadlineDays: 90,
  },
  {
    name: 'Colorado Bureau of Investigation',
    abbreviation: 'CBI',
    jurisdictionLevel: 'state',
    state: 'CO',
    foiaPortalUrl: 'https://cbi.colorado.gov/open-records-request',
    responseDeadlineDays: 3,
    appealDeadlineDays: 30,
  },
];

/** Local and county agency seed data including major city police departments */
const localAgencies: AgencySeed[] = [
  {
    name: 'New York City Police Department',
    abbreviation: 'NYPD',
    jurisdictionLevel: 'local',
    state: 'NY',
    city: 'New York',
    foiaPortalUrl:
      'https://www.nyc.gov/site/nypd/bureaus/administrative/freedom-of-information-law-foil.page',
    responseDeadlineDays: 5,
    appealDeadlineDays: 30,
  },
  {
    name: 'Los Angeles Police Department',
    abbreviation: 'LAPD',
    jurisdictionLevel: 'local',
    state: 'CA',
    city: 'Los Angeles',
    foiaPortalUrl:
      'https://www.lapdonline.org/office-of-the-chief-of-police/office-of-constitutional-policing-and-policy/risk-management-and-legal-affairs-division/',
    responseDeadlineDays: 10,
    appealDeadlineDays: 30,
  },
  {
    name: 'Chicago Police Department',
    abbreviation: 'CPD',
    jurisdictionLevel: 'local',
    state: 'IL',
    city: 'Chicago',
    foiaPortalUrl: 'https://www.chicago.gov/city/en/depts/cpd/provdrs/foia.html',
    responseDeadlineDays: 5,
    appealDeadlineDays: 60,
  },
  {
    name: 'Houston Police Department',
    abbreviation: 'HPD',
    jurisdictionLevel: 'local',
    state: 'TX',
    city: 'Houston',
    foiaPortalUrl: 'https://www.houstontx.gov/police/public_info/open_records.htm',
    responseDeadlineDays: 10,
    appealDeadlineDays: 30,
  },
  {
    name: 'Phoenix Police Department',
    abbreviation: 'PHX PD',
    jurisdictionLevel: 'local',
    state: 'AZ',
    city: 'Phoenix',
    foiaPortalUrl: 'https://www.phoenix.gov/police/resources-information/public-records-requests',
    responseDeadlineDays: 0,
    appealDeadlineDays: 30,
  },
  {
    name: 'Philadelphia Police Department',
    abbreviation: 'PPD',
    jurisdictionLevel: 'local',
    state: 'PA',
    city: 'Philadelphia',
    foiaPortalUrl: 'https://www.phillypolice.com/forms/right-to-know-requests/',
    responseDeadlineDays: 5,
    appealDeadlineDays: 15,
  },
  {
    name: 'San Antonio Police Department',
    abbreviation: 'SAPD',
    jurisdictionLevel: 'local',
    state: 'TX',
    city: 'San Antonio',
    foiaPortalUrl: 'https://www.sanantonio.gov/SAPD/Open-Records',
    responseDeadlineDays: 10,
    appealDeadlineDays: 30,
  },
  {
    name: 'San Diego Police Department',
    abbreviation: 'SDPD',
    jurisdictionLevel: 'local',
    state: 'CA',
    city: 'San Diego',
    foiaPortalUrl: 'https://www.sandiego.gov/police/services/public-records',
    responseDeadlineDays: 10,
    appealDeadlineDays: 30,
  },
  {
    name: 'Dallas Police Department',
    abbreviation: 'DPD',
    jurisdictionLevel: 'local',
    state: 'TX',
    city: 'Dallas',
    foiaPortalUrl: 'https://dallaspolice.net/resource/openRecords',
    responseDeadlineDays: 10,
    appealDeadlineDays: 30,
  },
  {
    name: 'San Jose Police Department',
    abbreviation: 'SJPD',
    jurisdictionLevel: 'local',
    state: 'CA',
    city: 'San Jose',
    foiaPortalUrl: 'https://www.sjpd.org/records/public-records-request',
    responseDeadlineDays: 10,
    appealDeadlineDays: 30,
  },
  {
    name: 'Austin Police Department',
    abbreviation: 'APD',
    jurisdictionLevel: 'local',
    state: 'TX',
    city: 'Austin',
    foiaPortalUrl: 'https://www.austintexas.gov/department/open-records-requests',
    responseDeadlineDays: 10,
    appealDeadlineDays: 30,
  },
  {
    name: 'Denver Police Department',
    abbreviation: 'DEN PD',
    jurisdictionLevel: 'local',
    state: 'CO',
    city: 'Denver',
    foiaPortalUrl:
      'https://www.denvergov.org/Government/Agencies-Departments-Offices/Agencies-Departments-Offices-Directory/Police-Department/About-Us/Records-Request',
    responseDeadlineDays: 3,
    appealDeadlineDays: 30,
  },
  {
    name: 'Seattle Police Department',
    abbreviation: 'SPD',
    jurisdictionLevel: 'local',
    state: 'WA',
    city: 'Seattle',
    foiaPortalUrl:
      'https://www.seattle.gov/police/information-and-data/public-disclosure-and-records',
    responseDeadlineDays: 5,
    appealDeadlineDays: 30,
  },
  {
    name: 'Boston Police Department',
    abbreviation: 'BPD',
    jurisdictionLevel: 'local',
    state: 'MA',
    city: 'Boston',
    foiaPortalUrl: 'https://www.boston.gov/departments/police/public-records-requests',
    responseDeadlineDays: 10,
    appealDeadlineDays: 90,
  },
  {
    name: 'Detroit Police Department',
    abbreviation: 'DET PD',
    jurisdictionLevel: 'local',
    state: 'MI',
    city: 'Detroit',
    foiaPortalUrl:
      'https://detroitmi.gov/departments/police-department/freedom-information-act-foia-request',
    responseDeadlineDays: 5,
    appealDeadlineDays: 10,
  },
  {
    name: 'Miami Police Department',
    abbreviation: 'MPD',
    jurisdictionLevel: 'local',
    state: 'FL',
    city: 'Miami',
    foiaPortalUrl: 'https://www.miami-police.org/records_request.html',
    responseDeadlineDays: 0,
    appealDeadlineDays: 30,
  },
  {
    name: 'Atlanta Police Department',
    abbreviation: 'ATL PD',
    jurisdictionLevel: 'local',
    state: 'GA',
    city: 'Atlanta',
    foiaPortalUrl: 'https://www.atlantapd.org/services/open-records-unit',
    responseDeadlineDays: 3,
    appealDeadlineDays: 30,
  },
  {
    name: 'Minneapolis Police Department',
    abbreviation: 'MPD',
    jurisdictionLevel: 'local',
    state: 'MN',
    city: 'Minneapolis',
    foiaPortalUrl: 'https://www.minneapolismn.gov/government/government-data/public-data-requests/',
    responseDeadlineDays: 10,
    appealDeadlineDays: 30,
  },
  {
    name: "Los Angeles County Sheriff's Department",
    abbreviation: 'LASD',
    jurisdictionLevel: 'county',
    state: 'CA',
    county: 'Los Angeles',
    foiaPortalUrl: 'https://lasd.org/transparency/public-records/',
    responseDeadlineDays: 10,
    appealDeadlineDays: 30,
  },
  {
    name: "Harris County Sheriff's Office",
    abbreviation: 'HCSO',
    jurisdictionLevel: 'county',
    state: 'TX',
    county: 'Harris',
    foiaPortalUrl: 'https://www.harriscountyso.org/Records/open-records',
    responseDeadlineDays: 10,
    appealDeadlineDays: 30,
  },
  {
    name: "Maricopa County Sheriff's Office",
    abbreviation: 'MCSO',
    jurisdictionLevel: 'county',
    state: 'AZ',
    county: 'Maricopa',
    foiaPortalUrl: 'https://www.mcso.org/What-We-Do/Public-Records',
    responseDeadlineDays: 0,
    appealDeadlineDays: 30,
  },
  {
    name: "Cook County Sheriff's Office",
    abbreviation: 'CCSO',
    jurisdictionLevel: 'county',
    state: 'IL',
    county: 'Cook',
    foiaPortalUrl: 'https://www.cookcountysheriff.org/foia/',
    responseDeadlineDays: 5,
    appealDeadlineDays: 60,
  },
  {
    name: "San Diego County Sheriff's Department",
    abbreviation: 'SD Sheriff',
    jurisdictionLevel: 'county',
    state: 'CA',
    county: 'San Diego',
    foiaPortalUrl: 'https://www.sdsheriff.gov/bureaus/human-resources-bureau/public-records',
    responseDeadlineDays: 10,
    appealDeadlineDays: 30,
  },
];

/**
 * Seeds the database with FOIA-accepting agencies
 * @returns {Promise<void>}
 * @example
 * ```typescript
 * await seedAgencies();
 * ```
 */
async function applyMigrationsIfNeeded() {
  // Check for agencies table
  try {
    const res = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='agencies'").get();
    if (!res) {
      console.log('📦 No schema detected. Applying drizzle SQL migrations...');
      const migrationsDir = path.resolve(__dirname, '../../drizzle');
      const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
      for (const fileName of files) {
        const content = fs.readFileSync(path.join(migrationsDir, fileName), 'utf8');
        // Split using the special marker used in migration files
        const parts = content.split('--> statement-breakpoint');
        for (const part of parts) {
          const sql = part.trim();
          if (!sql) continue;
          try {
            sqlite.exec(sql);
          } catch (err) {
            console.warn(`Warning: Failed to execute migration chunk from ${fileName}:`, (err as Error)?.message || err);
          }
        }
      }
      console.log('✅ Migrations applied');
    }
  } catch (err) {
    console.error('Failed to check or apply migrations:', err);
    throw err;
  }
}

export async function seedAgencies() {
  await applyMigrationsIfNeeded();

  const allAgencies = [...federalAgencies, ...stateAgencies, ...localAgencies];
  const now = new Date().toISOString();

  console.log(`🌱 Seeding ${allAgencies.length} agencies...`);

  const existingAgencies = await db.select({ name: schema.agencies.name }).from(schema.agencies);
  const existingNames = new Set(existingAgencies.map((a) => a.name));

  let inserted = 0;
  let skipped = 0;

  for (const agency of allAgencies) {
    if (existingNames.has(agency.name)) {
      skipped++;
      continue;
    }

    try {
      await db.insert(schema.agencies).values({
        id: nanoid(),
        name: agency.name,
        abbreviation: agency.abbreviation,
        jurisdictionLevel: agency.jurisdictionLevel,
        state: agency.state,
        city: agency.city,
        county: agency.county,
        foiaEmail: agency.foiaEmail,
        foiaAddress: agency.foiaAddress,
        foiaPortalUrl: agency.foiaPortalUrl,
        responseDeadlineDays: agency.responseDeadlineDays ?? 20,
        appealDeadlineDays: agency.appealDeadlineDays ?? 30,
        createdAt: now,
        updatedAt: now,
      });
      inserted++;
    } catch (error) {
      console.error(`Failed to insert ${agency.name}:`, error);
    }
  }

  console.log(`✅ Seeded ${inserted} agencies (${skipped} already existed)`);
  console.log(`   - Federal: ${federalAgencies.length}`);
  console.log(`   - State: ${stateAgencies.length}`);
  console.log(`   - Local/County: ${localAgencies.length}`);
}

if (import.meta.main) {
  seedAgencies()
    .then(() => {
      console.log('🎉 Agency seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
