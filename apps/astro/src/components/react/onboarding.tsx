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
 * @file Animated onboarding flow component
 * @module components/react/Onboarding
 */

import { ArrowRight, Check, ChevronLeft, FileText, Search, Send, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { $user, useAuthStore } from '@/stores/auth';

/**
 * Onboarding step configuration
 */
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tips: string[];
  action?: {
    label: string;
    href: string;
  };
}

const ONBOARDING_KEY = 'foiastream_onboarding_completed';

const steps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to FOIA Stream!',
    description:
      'Your streamlined platform for submitting and tracking Freedom of Information Act requests.',
    icon: <Sparkles className="h-8 w-8" />,
    tips: [
      'Track all your requests in one place',
      'Use professional templates',
      'Get notifications on updates',
    ],
  },
  {
    id: 'find-agency',
    title: 'Find Your Agency',
    description:
      'Search our database of federal, state, and local agencies to find the right one for your request.',
    icon: <Search className="h-8 w-8" />,
    tips: [
      'Browse by jurisdiction (federal, state, local)',
      'Filter by state for local agencies',
      'Save your favorite agencies for quick access',
    ],
    action: {
      label: 'Browse Agencies',
      href: '/agencies',
    },
  },
  {
    id: 'choose-template',
    title: 'Choose a Template',
    description: 'Start with a professional template tailored for specific types of requests.',
    icon: <FileText className="h-8 w-8" />,
    tips: [
      'Templates for body cameras, contracts, emails & more',
      'Customize with your specific details',
      'Variables are highlighted for easy editing',
    ],
    action: {
      label: 'View Templates',
      href: '/templates',
    },
  },
  {
    id: 'submit-track',
    title: 'Submit & Track',
    description:
      "Submit your request and we'll help you track its progress through the entire process.",
    icon: <Send className="h-8 w-8" />,
    tips: [
      'Automatic deadline tracking',
      'Status updates and notifications',
      'Easy appeal filing if needed',
    ],
    action: {
      label: 'Create First Request',
      href: '/dashboard',
    },
  },
];

/**
 * Animated onboarding modal component
 * Shows for new users to guide them through the platform
 */
export default function Onboarding() {
  const user = useAuthStore((s) => s.user);
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    if (typeof window !== 'undefined' && user) {
      const completed = localStorage.getItem(ONBOARDING_KEY);
      if (!completed) {
        // Show after a short delay
        setTimeout(() => setIsVisible(true), 500);
      }
    }
  }, [user]);

  const handleNext = () => {
    if (animating) return;
    setAnimating(true);

    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }

    setTimeout(() => setAnimating(false), 300);
  };

  const handlePrev = () => {
    if (animating || currentStep === 0) return;
    setAnimating(true);
    setCurrentStep((prev) => prev - 1);
    setTimeout(() => setAnimating(false), 300);
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsVisible(false);
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="relative mx-4 w-full max-w-lg overflow-hidden rounded-2xl border border-surface-700 bg-surface-900 shadow-2xl"
        style={{
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {/* Progress bar */}
        <div className="h-1 bg-surface-800">
          <div
            className="h-full bg-linear-to-r from-accent-500 to-accent-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Skip button */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute right-4 top-4 text-xs text-surface-500 transition-colors hover:text-surface-300"
        >
          Skip tutorial
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Step indicator */}
          <div className="mb-6 flex items-center justify-center gap-2">
            {steps.map((s, index) => (
              <div
                key={s.id}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'w-6 bg-accent-500'
                    : index < currentStep
                      ? 'bg-accent-500/50'
                      : 'bg-surface-700'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-accent-500/20 to-accent-600/10"
            style={{
              animation: animating ? 'pulse 0.3s ease-out' : undefined,
            }}
          >
            <div className="text-accent-400">{step.icon}</div>
          </div>

          {/* Title & Description */}
          <div
            className="text-center transition-opacity duration-200"
            style={{ opacity: animating ? 0.5 : 1 }}
          >
            <h2 className="text-2xl font-bold text-surface-100">{step.title}</h2>
            <p className="mt-3 text-surface-400">{step.description}</p>
          </div>

          {/* Tips */}
          <div className="mt-6 space-y-2">
            {step.tips.map((tip, index) => (
              <div
                key={tip}
                className="flex items-start gap-3 rounded-lg bg-surface-800/50 px-4 py-3"
                style={{
                  animation: `fadeIn 0.3s ease-out ${index * 0.1}s both`,
                }}
              >
                <Check className="h-4 w-4 shrink-0 text-accent-400 mt-0.5" />
                <span className="text-sm text-surface-300">{tip}</span>
              </div>
            ))}
          </div>

          {/* Action button (optional) */}
          {step.action && (
            <a
              href={step.action.href}
              onClick={handleComplete}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-accent-500/30 bg-accent-500/10 px-4 py-3 text-sm font-medium text-accent-400 transition-all hover:bg-accent-500/20"
            >
              {step.action.label}
              <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between border-t border-surface-800 bg-surface-900/50 px-6 py-4">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-surface-400 transition-colors hover:text-surface-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <span className="text-sm text-surface-500">
            {currentStep + 1} of {steps.length}
          </span>

          {isLastStep ? (
            <button
              type="button"
              onClick={handleComplete}
              className="flex items-center gap-2 rounded-lg bg-accent-500 px-6 py-2 text-sm font-semibold text-surface-950 transition-all hover:bg-accent-400"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 rounded-lg bg-accent-500 px-6 py-2 text-sm font-semibold text-surface-950 transition-all hover:bg-accent-400"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
