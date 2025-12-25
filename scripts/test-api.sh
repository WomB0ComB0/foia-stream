#!/bin/bash

# Copyright (c) 2025 Foia Stream
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

# FOIA Stream API Test Script
# Tests all backend endpoints

set -e

API_URL="${API_URL:-http://localhost:3000}"
TOKEN=""
USER_ID=""
REQUEST_ID=""
AGENCY_ID=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
}

print_test() {
  echo -e "\n${YELLOW}▶ $1${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_info() {
  echo -e "  ${NC}$1${NC}"
}

# Make a request and capture response
request() {
  local method=$1
  local endpoint=$2
  local data=$3
  local auth=$4

  local curl_args=("-s" "-X" "$method" "${API_URL}${endpoint}")
  curl_args+=("-H" "Content-Type: application/json")

  if [ -n "$auth" ] && [ -n "$TOKEN" ]; then
    curl_args+=("-H" "Authorization: Bearer $TOKEN")
  fi

  if [ -n "$data" ]; then
    curl_args+=("-d" "$data")
  fi

  curl "${curl_args[@]}"
}

# Test health check
test_health() {
  print_header "Health Check"

  print_test "GET /health"
  response=$(request GET "/health")
  echo "$response" | jq . 2>/dev/null || echo "$response"

  if echo "$response" | grep -q '"status":"healthy"'; then
    print_success "Health check passed"
  else
    print_error "Health check failed"
    exit 1
  fi
}

# Test API info
test_api_info() {
  print_header "API Info"

  print_test "GET /"
  response=$(request GET "/")
  echo "$response" | jq . 2>/dev/null || echo "$response"

  if echo "$response" | grep -q '"name"'; then
    print_success "API info retrieved"
  else
    print_error "Failed to get API info"
  fi
}

# Test registration
test_register() {
  print_header "User Registration"

  local email="test-$(date +%s)@example.com"
  local password="TestPassword123!"

  print_test "POST /api/v1/auth/register"
  print_info "Email: $email"

  local data=$(cat <<EOF
{
  "email": "$email",
  "password": "$password",
  "firstName": "Test",
  "lastName": "User",
  "organization": "Test Organization"
}
EOF
)

  response=$(request POST "/api/v1/auth/register" "$data")
  echo "$response" | jq . 2>/dev/null || echo "$response"

  if echo "$response" | grep -q '"token"'; then
    TOKEN=$(echo "$response" | jq -r '.data.token // .token' 2>/dev/null)
    USER_ID=$(echo "$response" | jq -r '.data.user.id // .user.id' 2>/dev/null)
    print_success "User registered successfully"
    print_info "Token: ${TOKEN:0:50}..."
    print_info "User ID: $USER_ID"

    # Save credentials for login test
    TEST_EMAIL="$email"
    TEST_PASSWORD="$password"
  else
    print_error "Registration failed"
  fi
}

# Test login
test_login() {
  print_header "User Login"

  if [ -z "$TEST_EMAIL" ]; then
    TEST_EMAIL="test@example.com"
    TEST_PASSWORD="TestPassword123!"
  fi

  print_test "POST /api/v1/auth/login"
  print_info "Email: $TEST_EMAIL"

  local data=$(cat <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD"
}
EOF
)

  response=$(request POST "/api/v1/auth/login" "$data")
  echo "$response" | jq . 2>/dev/null || echo "$response"

  if echo "$response" | grep -q '"token"'; then
    TOKEN=$(echo "$response" | jq -r '.data.token // .token' 2>/dev/null)
    print_success "Login successful"
    print_info "Token: ${TOKEN:0:50}..."
  else
    print_error "Login failed"
  fi
}

# Test get profile
test_profile() {
  print_header "User Profile"

  print_test "GET /api/v1/auth/profile"
  response=$(request GET "/api/v1/auth/profile" "" "auth")
  echo "$response" | jq . 2>/dev/null || echo "$response"

  if echo "$response" | grep -q '"email"'; then
    print_success "Profile retrieved"
  else
    print_error "Failed to get profile (may need authentication)"
  fi
}

# Test list agencies
test_agencies() {
  print_header "Agencies"

  print_test "GET /api/v1/agencies"
  response=$(request GET "/api/v1/agencies" "" "auth")
  echo "$response" | jq . 2>/dev/null || echo "$response"

  # Try to get first agency ID
  AGENCY_ID=$(echo "$response" | jq -r '.data[0].id // empty' 2>/dev/null)

  if [ -n "$AGENCY_ID" ]; then
    print_success "Agencies retrieved"
    print_info "First Agency ID: $AGENCY_ID"
  else
    print_info "No agencies found - creating one for testing"

    # Create a test agency if none exist
    print_test "POST /api/v1/agencies (create test agency)"
    local agency_data=$(cat <<EOF
{
  "name": "Test Federal Agency",
  "abbreviation": "TFA",
  "jurisdictionLevel": "federal",
  "foiaEmail": "foia@testagency.gov",
  "foiaUrl": "https://testagency.gov/foia",
  "responseDeadlineDays": 20
}
EOF
)
    response=$(request POST "/api/v1/agencies" "$agency_data" "auth")
    echo "$response" | jq . 2>/dev/null || echo "$response"
    AGENCY_ID=$(echo "$response" | jq -r '.data.id // .id // empty' 2>/dev/null)

    if [ -n "$AGENCY_ID" ]; then
      print_success "Test agency created"
      print_info "Agency ID: $AGENCY_ID"
    fi
  fi

  # Test search
  print_test "GET /api/v1/agencies?search=federal"
  response=$(request GET "/api/v1/agencies?search=federal" "" "auth")
  echo "$response" | jq . 2>/dev/null || echo "$response"

  # Test states endpoint
  print_test "GET /api/v1/agencies/states"
  response=$(request GET "/api/v1/agencies/states" "" "auth")
  echo "$response" | jq . 2>/dev/null || echo "$response"
}

# Test FOIA requests
test_requests() {
  print_header "FOIA Requests"

  # List requests
  print_test "GET /api/v1/requests"
  response=$(request GET "/api/v1/requests" "" "auth")
  echo "$response" | jq . 2>/dev/null || echo "$response"

  if echo "$response" | grep -q '"data"'; then
    print_success "Requests listed"
  else
    print_error "Failed to list requests"
  fi

  # Create a request (need an agency ID)
  if [ -n "$AGENCY_ID" ]; then
    print_test "POST /api/v1/requests (create new request)"
    local request_data=$(cat <<EOF
{
  "agencyId": "$AGENCY_ID",
  "title": "Test FOIA Request - $(date +%Y%m%d%H%M%S)",
  "description": "This is a test FOIA request created by the API test script. I am requesting all documents related to testing procedures.",
  "category": "general",
  "dateRange": "January 2024 - December 2024",
  "expeditedProcessing": false,
  "feeWaiverRequested": true
}
EOF
)
    response=$(request POST "/api/v1/requests" "$request_data" "auth")
    echo "$response" | jq . 2>/dev/null || echo "$response"

    REQUEST_ID=$(echo "$response" | jq -r '.data.id // .id // empty' 2>/dev/null)

    if [ -n "$REQUEST_ID" ]; then
      print_success "FOIA request created"
      print_info "Request ID: $REQUEST_ID"

      # Get specific request
      print_test "GET /api/v1/requests/$REQUEST_ID"
      response=$(request GET "/api/v1/requests/$REQUEST_ID" "" "auth")
      echo "$response" | jq . 2>/dev/null || echo "$response"

      # Update request
      print_test "PATCH /api/v1/requests/$REQUEST_ID (update)"
      local update_data=$(cat <<EOF
{
  "title": "Updated Test FOIA Request",
  "description": "This description has been updated by the test script."
}
EOF
)
      response=$(request PATCH "/api/v1/requests/$REQUEST_ID" "$update_data" "auth")
      echo "$response" | jq . 2>/dev/null || echo "$response"

      if echo "$response" | grep -q '"Updated"'; then
        print_success "Request updated"
      fi
    else
      print_error "Failed to create request"
    fi
  else
    print_info "Skipping request creation - no agency ID available"
  fi

  # Test search/filter
  print_test "GET /api/v1/requests?status=draft"
  response=$(request GET "/api/v1/requests?status=draft" "" "auth")
  echo "$response" | jq . 2>/dev/null || echo "$response"
}

# Test templates
test_templates() {
  print_header "Request Templates"

  print_test "GET /api/v1/templates"
  response=$(request GET "/api/v1/templates" "" "auth")
  echo "$response" | jq . 2>/dev/null || echo "$response"

  if echo "$response" | grep -q '"data"\|"success"'; then
    print_success "Templates endpoint working"
  else
    print_info "Templates endpoint returned unexpected response"
  fi
}

# Test logout
test_logout() {
  print_header "User Logout"

  print_test "POST /api/v1/auth/logout"
  response=$(request POST "/api/v1/auth/logout" "" "auth")
  echo "$response" | jq . 2>/dev/null || echo "$response"

  if echo "$response" | grep -q '"success":true\|"message"'; then
    print_success "Logout successful"
  else
    print_info "Logout response"
  fi
}

# Test error handling
test_errors() {
  print_header "Error Handling"

  print_test "GET /api/v1/nonexistent (404 test)"
  response=$(request GET "/api/v1/nonexistent")
  echo "$response" | jq . 2>/dev/null || echo "$response"

  print_test "POST /api/v1/auth/login with invalid credentials"
  local data='{"email": "invalid@example.com", "password": "wrongpassword"}'
  response=$(request POST "/api/v1/auth/login" "$data")
  echo "$response" | jq . 2>/dev/null || echo "$response"

  print_test "POST /api/v1/auth/register with invalid data"
  local data='{"email": "notanemail", "password": "short"}'
  response=$(request POST "/api/v1/auth/register" "$data")
  echo "$response" | jq . 2>/dev/null || echo "$response"

  print_test "GET /api/v1/requests without auth"
  TOKEN_BACKUP="$TOKEN"
  TOKEN=""
  response=$(request GET "/api/v1/requests")
  echo "$response" | jq . 2>/dev/null || echo "$response"
  TOKEN="$TOKEN_BACKUP"
}

# Summary
print_summary() {
  print_header "Test Summary"
  echo ""
  echo "  API URL: $API_URL"
  echo "  User ID: ${USER_ID:-N/A}"
  echo "  Agency ID: ${AGENCY_ID:-N/A}"
  echo "  Request ID: ${REQUEST_ID:-N/A}"
  echo ""
  print_success "All tests completed!"
  echo ""
}

# Main execution
main() {
  echo ""
  echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║        FOIA Stream API Test Script                        ║${NC}"
  echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "Testing API at: $API_URL"
  echo ""

  # Check if server is running
  if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
    print_error "API server is not running at $API_URL"
    echo "Start the server with: bun run dev"
    exit 1
  fi

  test_health
  test_api_info
  test_register
  test_login
  test_profile
  test_agencies
  test_requests
  test_templates
  test_errors
  test_logout
  print_summary
}

# Run specific test or all
if [ -n "$1" ]; then
  case "$1" in
    health) test_health ;;
    info) test_api_info ;;
    register) test_register ;;
    login) test_login ;;
    profile) test_profile ;;
    agencies) test_agencies ;;
    requests) test_requests ;;
    templates) test_templates ;;
    errors) test_errors ;;
    logout) test_logout ;;
    *) echo "Unknown test: $1"; echo "Available: health, info, register, login, profile, agencies, requests, templates, errors, logout"; exit 1 ;;
  esac
else
  main
fi
