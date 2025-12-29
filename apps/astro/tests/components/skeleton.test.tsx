/**
 * Copyright (c) 2025 Foia Stream
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Skeleton,
  SkeletonAgencyCard,
  SkeletonCard,
  SkeletonGrid,
  SkeletonRequestItem,
  SkeletonStatCard,
  SkeletonTemplateCard,
  SkeletonText,
} from '../../src/components/react/common/skeleton';

describe('Skeleton', () => {
  it('should render with default classes', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('animate-pulse');
    expect(skeleton).toHaveClass('rounded');
    expect(skeleton).toHaveClass('bg-surface-800');
  });

  it('should accept custom className', () => {
    const { container } = render(<Skeleton className="h-10 w-full" />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('h-10');
    expect(skeleton).toHaveClass('w-full');
  });
});

describe('SkeletonText', () => {
  it('should render single line by default', () => {
    const { container } = render(<SkeletonText />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(1);
  });

  it('should render multiple lines', () => {
    const { container } = render(<SkeletonText lines={3} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(3);
  });

  it('should render last line shorter when multiple lines', () => {
    const { container } = render(<SkeletonText lines={3} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    const lastSkeleton = skeletons[2] as HTMLElement;
    expect(lastSkeleton).toHaveClass('w-3/4');
  });
});

describe('SkeletonCard', () => {
  it('should render a card structure', () => {
    const { container } = render(<SkeletonCard />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('rounded-xl');
    expect(card).toHaveClass('border');
  });

  it('should contain multiple skeleton elements', () => {
    const { container } = render(<SkeletonCard />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(1);
  });
});

describe('SkeletonRequestItem', () => {
  it('should render request item layout', () => {
    const { container } = render(<SkeletonRequestItem />);
    const item = container.firstChild as HTMLElement;
    expect(item).toHaveClass('px-6');
    expect(item).toHaveClass('py-4');
  });

  it('should contain skeleton elements for title and content', () => {
    const { container } = render(<SkeletonRequestItem />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(3);
  });
});

describe('SkeletonStatCard', () => {
  it('should render stat card structure', () => {
    const { container } = render(<SkeletonStatCard />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('rounded-xl');
  });

  it('should have icon and value placeholders', () => {
    const { container } = render(<SkeletonStatCard />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });
});

describe('SkeletonAgencyCard', () => {
  it('should render agency card structure', () => {
    const { container } = render(<SkeletonAgencyCard />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('rounded-xl');
    expect(card).toHaveClass('border');
  });

  it('should contain multiple content areas', () => {
    const { container } = render(<SkeletonAgencyCard />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(4);
  });
});

describe('SkeletonTemplateCard', () => {
  it('should render template card structure', () => {
    const { container } = render(<SkeletonTemplateCard />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('rounded-xl');
  });

  it('should have action button placeholders', () => {
    const { container } = render(<SkeletonTemplateCard />);
    // Check for button-like skeleton elements (h-10)
    const buttonSkeletons = container.querySelectorAll('.h-10');
    expect(buttonSkeletons.length).toBeGreaterThanOrEqual(1);
  });
});

describe('SkeletonGrid', () => {
  it('should render default 6 cards', () => {
    const { container } = render(<SkeletonGrid />);
    // Each SkeletonCard is a child of the grid
    const cards = container.firstChild?.childNodes;
    expect(cards).toHaveLength(6);
  });

  it('should render custom count', () => {
    const { container } = render(<SkeletonGrid count={3} />);
    const cards = container.firstChild?.childNodes;
    expect(cards).toHaveLength(3);
  });

  it('should use custom Card component', () => {
    const { container } = render(<SkeletonGrid count={2} Card={SkeletonAgencyCard} />);
    const cards = container.firstChild?.childNodes;
    expect(cards).toHaveLength(2);
  });

  it('should have grid layout classes', () => {
    const { container } = render(<SkeletonGrid />);
    const grid = container.firstChild as HTMLElement;
    expect(grid).toHaveClass('grid');
    expect(grid).toHaveClass('gap-4');
  });
});
