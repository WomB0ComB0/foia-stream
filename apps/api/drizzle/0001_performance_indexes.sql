-- Copyright (c) 2025 Foia Stream
--
-- Permission is hereby granted, free of charge, to any person obtaining a copy
-- of this software and associated documentation files (the "Software"), to deal
-- in the Software without restriction, including without limitation the rights
-- to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
-- copies of the Software, and to permit persons to whom the Software is
-- furnished to do so, subject to the following conditions:
--
-- The above copyright notice and this permission notice shall be included in all
-- copies or substantial portions of the Software.
--
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-- SOFTWARE.

-- Performance Optimization Migration
-- Adds indexes for common query patterns to prevent N+1 and improve query performance
-- Target: N+3 maximum queries for any operation

-- ============================================
-- Users Table Indexes
-- ============================================

-- Email lookup (login)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Role filtering (admin views)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Account lockout checks
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;

-- ============================================
-- Sessions Table Indexes
-- ============================================

-- Token lookup (auth middleware - hot path)
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- User sessions listing
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Expired session cleanup (data retention job)
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Composite: user + expiration for active session queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_expires ON sessions(user_id, expires_at);

-- ============================================
-- FOIA Requests Table Indexes (Critical)
-- ============================================

-- User's requests (my requests page)
CREATE INDEX IF NOT EXISTS idx_foia_requests_user_id ON foia_requests(user_id);

-- Agency's requests (agency dashboard)
CREATE INDEX IF NOT EXISTS idx_foia_requests_agency_id ON foia_requests(agency_id);

-- Status filtering (common filter)
CREATE INDEX IF NOT EXISTS idx_foia_requests_status ON foia_requests(status);

-- Category filtering
CREATE INDEX IF NOT EXISTS idx_foia_requests_category ON foia_requests(category);

-- Due date for deadline queries (overdue, upcoming)
CREATE INDEX IF NOT EXISTS idx_foia_requests_due_date ON foia_requests(due_date) WHERE due_date IS NOT NULL;

-- Public requests listing
CREATE INDEX IF NOT EXISTS idx_foia_requests_is_public ON foia_requests(is_public) WHERE is_public = 1;

-- Composite: user + status (my pending requests)
CREATE INDEX IF NOT EXISTS idx_foia_requests_user_status ON foia_requests(user_id, status);

-- Composite: agency + status (agency dashboard filtering)
CREATE INDEX IF NOT EXISTS idx_foia_requests_agency_status ON foia_requests(agency_id, status);

-- Composite: status + due_date (deadline queries)
CREATE INDEX IF NOT EXISTS idx_foia_requests_status_due ON foia_requests(status, due_date);

-- Created at for sorting (most recent)
CREATE INDEX IF NOT EXISTS idx_foia_requests_created_at ON foia_requests(created_at DESC);

-- ============================================
-- Documents Table Indexes
-- ============================================

-- Request's documents
CREATE INDEX IF NOT EXISTS idx_documents_request_id ON documents(request_id);

-- Agency's documents
CREATE INDEX IF NOT EXISTS idx_documents_agency_id ON documents(agency_id);

-- Document type filtering
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);

-- Public documents
CREATE INDEX IF NOT EXISTS idx_documents_is_public ON documents(is_public) WHERE is_public = 1;

-- ============================================
-- Agencies Table Indexes
-- ============================================

-- Jurisdiction filtering
CREATE INDEX IF NOT EXISTS idx_agencies_jurisdiction ON agencies(jurisdiction_level);

-- State filtering
CREATE INDEX IF NOT EXISTS idx_agencies_state ON agencies(state) WHERE state IS NOT NULL;

-- Composite: jurisdiction + state
CREATE INDEX IF NOT EXISTS idx_agencies_jurisdiction_state ON agencies(jurisdiction_level, state);

-- Name search (LIKE queries)
CREATE INDEX IF NOT EXISTS idx_agencies_name ON agencies(name);

-- ============================================
-- Audit Logs Table Indexes (Critical for compliance)
-- ============================================

-- User activity lookup
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;

-- Action filtering (security reports)
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Resource lookup
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Time-based queries (date range reports)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Composite: action + created_at (security event timeline)
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_time ON audit_logs(action, created_at DESC);

-- Composite: user + action (user activity report)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);

-- Security events only (fast security dashboard queries)
CREATE INDEX IF NOT EXISTS idx_audit_logs_security ON audit_logs(action, created_at DESC)
WHERE action LIKE 'security_%';

-- ============================================
-- Comments Table Indexes
-- ============================================

-- Document comments
CREATE INDEX IF NOT EXISTS idx_comments_document_id ON comments(document_id);

-- User's comments
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Comment type filtering
CREATE INDEX IF NOT EXISTS idx_comments_type ON comments(type);

-- ============================================
-- Appeals Table Indexes
-- ============================================

-- Request's appeals
CREATE INDEX IF NOT EXISTS idx_appeals_request_id ON appeals(request_id);

-- User's appeals
CREATE INDEX IF NOT EXISTS idx_appeals_user_id ON appeals(user_id);

-- Appeal status
CREATE INDEX IF NOT EXISTS idx_appeals_status ON appeals(status);

-- ============================================
-- API Keys Table Indexes
-- ============================================

-- Key lookup (auth)
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- User's API keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

-- ============================================
-- Request Templates Table Indexes
-- ============================================

-- Category filtering
CREATE INDEX IF NOT EXISTS idx_templates_category ON request_templates(category);

-- Official templates
CREATE INDEX IF NOT EXISTS idx_templates_official ON request_templates(is_official) WHERE is_official = 1;

-- Jurisdiction filtering
CREATE INDEX IF NOT EXISTS idx_templates_jurisdiction ON request_templates(jurisdiction_level) WHERE jurisdiction_level IS NOT NULL;

-- Usage ranking
CREATE INDEX IF NOT EXISTS idx_templates_usage ON request_templates(usage_count DESC);

-- ============================================
-- Knowledge Articles Table Indexes
-- ============================================

-- Category browsing
CREATE INDEX IF NOT EXISTS idx_articles_category ON knowledge_articles(category);

-- Published articles only
CREATE INDEX IF NOT EXISTS idx_articles_published ON knowledge_articles(is_published) WHERE is_published = 1;

-- State-specific guides
CREATE INDEX IF NOT EXISTS idx_articles_state ON knowledge_articles(state) WHERE state IS NOT NULL;

-- Popular articles
CREATE INDEX IF NOT EXISTS idx_articles_views ON knowledge_articles(view_count DESC);

-- ============================================
-- Stats Tables Indexes
-- ============================================

-- Use of force by agency and year
CREATE INDEX IF NOT EXISTS idx_uof_stats_agency_year ON use_of_force_stats(agency_id, year);
