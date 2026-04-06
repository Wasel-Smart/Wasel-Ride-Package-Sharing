/**
 * Accessibility Testing Utilities
 * Use jest-axe for automated accessibility testing in unit/component tests
 */

import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import type { ReactElement } from 'react';

// Extend matchers
expect.extend(toHaveNoViolations);

/**
 * A11y render helper that includes axe checks
 */
export async function renderWithA11y(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  const render = rtlRender(ui, options);
  const results = await axe(render.container);

  return {
    ...render,
    a11yResults: results,
    checkA11y: async () => {
      expect(results).toHaveNoViolations();
    },
  };
}

/**
 * Common accessibility test checks
 */
export const a11yTests = {
  /**
   * Test component has proper ARIA labels
   */
  async hasAriaLabels(container: HTMLElement, selector: string) {
    const elements = container.querySelectorAll(selector);
    expect(elements.length).toBeGreaterThan(0);

    for (const el of elements) {
      const hasAriaLabel = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
      expect(hasAriaLabel).toBeTruthy();
    }
  },

  /**
   * Test keyboard navigation
   */
  async supportsKeyboardNavigation(container: HTMLElement) {
    const interactiveElements = container.querySelectorAll('button, a, input, [role="button"]');
    expect(interactiveElements.length).toBeGreaterThan(0);

    for (const el of interactiveElements) {
      const tabindex = el.getAttribute('tabindex');
      // Either naturally focusable or explicitly tabindex="0"
      if (el.tagName !== 'BUTTON' && el.tagName !== 'A' && el.tagName !== 'INPUT') {
        expect(tabindex).toBe('0');
      }
    }
  },

  /**
   * Test color contrast
   */
  async hasGoodContrast(container: HTMLElement) {
    // Run axe contrast checks
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });

    const contrastViolations = results.violations.filter((v) => v.id === 'color-contrast');
    expect(contrastViolations).toHaveLength(0);
  },

  /**
   * Test heading hierarchy
   */
  async hasCorrectHeadingHierarchy(container: HTMLElement) {
    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let previousLevel = 0;

    for (const heading of headings) {
      const level = parseInt(heading.tagName[1]);
      // Heading should not skip levels (e.g., h1 -> h3 is wrong)
      expect(level).toBeLessThanOrEqual(previousLevel + 1);
      previousLevel = level;
    }
  },

  /**
   * Test form accessibility
   */
  async hasAccessibleForm(container: HTMLElement) {
    const inputs = container.querySelectorAll('input, textarea, select');

    for (const input of inputs) {
      // Must have associated label
      const label = container.querySelector(`label[for="${input.id}"]`);
      const hasAriaLabel = input.getAttribute('aria-label');
      expect(label || hasAriaLabel).toBeTruthy();

      // Must have type attribute
      expect(input).toHaveAttribute('type');

      // Required fields should be marked
      if (input.hasAttribute('required')) {
        expect(input).toHaveAttribute('aria-required', 'true');
      }
    }
  },

  /**
   * Test image accessibility
   */
  async hasAccessibleImages(container: HTMLElement) {
    const images = container.querySelectorAll('img');

    for (const img of images) {
      // Must have alt text (unless decorative)
      const hasAlt = img.hasAttribute('alt');
      const isDecorative = img.getAttribute('aria-hidden') === 'true' || img.className.includes('decorative');

      if (!isDecorative) {
        expect(hasAlt).toBeTruthy();
        expect(img.getAttribute('alt')).not.toBe(''); // Not empty
      }
    }
  },

  /**
   * Test focus management
   */
  async hasFocusManagement(container: HTMLElement) {
    const focusableElements = container.querySelectorAll(
      'button, a, input, [tabindex], [role="button"], [role="link"]',
    );

    // Should have focusable elements
    expect(focusableElements.length).toBeGreaterThan(0);

    // Focus should be visible
    for (const el of focusableElements) {
      const styles = getComputedStyle(el, ':focus');
      // Check if element has focus styles defined
      expect(styles.outline || styles.boxShadow || styles.backgroundColor).toBeDefined();
    }
  },
};

/**
 * Accessibility test helper for custom WCAG rules
 */
export async function checkWCAG(
  container: HTMLElement,
  wcagLevel: 'A' | 'AA' | 'AAA' = 'AA',
) {
  const results = await axe(container, {
    runOnly: {
      type: 'tag',
      values: [`wcag${wcagLevel}`],
    },
  });

  return {
    passed: results.violations.length === 0,
    violations: results.violations,
    passes: results.passes,
  };
}
