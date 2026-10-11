import { test, expect } from '@playwright/test';

/**
 * Smoke test: verify the application loads without errors.
 */
test.describe('TeachIt Application', () => {
  test('loads without errors and shows main interface', async ({ page }) => {
    // Track any console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await page.goto('/');

    // Wait for the app to be fully rendered
    await page.waitForLoadState('networkidle');

    // Verify the main header/wordmark is visible
    await expect(page.getByRole('button', { name: 'TeachIt' })).toBeVisible();

    // Verify primary navigation tabs are present (use exact to avoid duplicates)
    await expect(page.getByRole('button', { name: 'Today', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Plan', exact: true })).toBeVisible();

    // Verify settings button is present
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();

    // Verify no uncaught errors occurred during load
    expect(errors.filter(e => !e.includes('favicon') && !e.includes('DevTools'))).toHaveLength(0);
  });

  test('displays Today view by default', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Today view should show date and class/subject info
    // Use role button with exact for the nav tab
    await expect(page.getByRole('button', { name: 'Today', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Plan', exact: true })).toBeVisible();

    // Should show "No lesson open yet" or a lesson card
    const hasLessonCard = await page.locator('text=Continue teaching').isVisible();
    const hasNoLesson = await page.locator('text=No lesson open yet').isVisible();
    expect(hasLessonCard || hasNoLesson).toBeTruthy();
  });

  test('navigates to Plan view', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Plan tab (use exact to target header nav)
    await page.getByRole('button', { name: 'Plan', exact: true }).click();
    await page.waitForLoadState('networkidle');

    // Verify Plan header is visible
    await expect(page.getByRole('heading', { name: 'Plan' })).toBeVisible();

    // Verify Class/Subject selector is present
    await expect(page.getByText('Class')).toBeVisible();
    await expect(page.getByText('Subjects')).toBeVisible();
  });

  test('navigates to Lesson Library view from Plan', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Plan', exact: true }).click();
    await page.waitForLoadState('networkidle');

    // Click Lesson library link
    await page.getByRole('button', { name: /Lesson library/i }).click();
    await page.waitForLoadState('networkidle');

    // Verify Lesson Library header
    await expect(page.getByRole('heading', { name: /Curriculum & Lesson Library/i })).toBeVisible();

    // Verify New Lesson Plan button
    await expect(page.getByRole('button', { name: /New Lesson Plan/i })).toBeVisible();
  });
});