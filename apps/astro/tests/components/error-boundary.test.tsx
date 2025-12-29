/**
 * Copyright (c) 2025 Foia Stream
 * Error Boundary Component Tests
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  EmptyState,
  ErrorBoundary,
  ErrorDisplay,
} from '../../src/components/react/common/error-boundary';

// Component that throws an error for testing
function ThrowError(): never {
  throw new Error('Test error message');
}

// Suppress console.error during error boundary tests
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});
afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should render fallback UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should show error details in expandable section', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Error details')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowError />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });

  it('should have Try Again button', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should have Go Home link', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );

    const homeLink = screen.getByText('Go Home');
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
  });
});

describe('ErrorDisplay', () => {
  it('should render with default message', () => {
    render(<ErrorDisplay />);
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    render(<ErrorDisplay message="Custom error message" />);
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('should show retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<ErrorDisplay onRetry={onRetry} />);

    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should not show retry button when onRetry is not provided', () => {
    render(<ErrorDisplay />);
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('should render title and description', () => {
    render(
      <EmptyState
        icon={<span>Icon</span>}
        title="No items"
        description="There are no items to display"
      />,
    );

    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('There are no items to display')).toBeInTheDocument();
  });

  it('should render icon', () => {
    render(
      <EmptyState
        icon={<span data-testid="empty-icon">Icon</span>}
        title="No items"
        description="Description"
      />,
    );

    expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
  });

  it('should render action link when href is provided', () => {
    render(
      <EmptyState
        icon={<span>Icon</span>}
        title="No items"
        description="Description"
        action={{ label: 'Create New', href: '/create' }}
      />,
    );

    const actionLink = screen.getByText('Create New');
    expect(actionLink).toBeInTheDocument();
    expect(actionLink.closest('a')).toHaveAttribute('href', '/create');
  });

  it('should render action button when onClick is provided', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        icon={<span>Icon</span>}
        title="No items"
        description="Description"
        action={{ label: 'Try Again', onClick }}
      />,
    );

    const actionButton = screen.getByText('Try Again');
    fireEvent.click(actionButton);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should not render action when not provided', () => {
    render(<EmptyState icon={<span>Icon</span>} title="No items" description="Description" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
