/**
 * Vitest runs the unit/regression specs in tests/.
 * The Playwright e2e specs (smoke, lesson-lifecycle) are excluded here and are
 * excluded from Playwright via testIgnore in playwright.config.ts, so each
 * runner owns exactly the specs it can execute.
 *
 * Written as a plain object (no `vitest/config` import) so it loads even when
 * vitest itself is resolved outside the local node_modules tree.
 */
export default {
  test: {
    include: ['tests/**/*.spec.ts'],
    exclude: [
      'tests/smoke.spec.ts',
      'tests/lesson-lifecycle.spec.ts',
      'node_modules/**',
    ],
    environment: 'node',
  },
};
