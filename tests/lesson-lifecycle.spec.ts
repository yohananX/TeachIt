import { test, expect } from '@playwright/test';

/**
 * Lesson lifecycle end-to-end tests.
 * Each test uses an isolated browser context with its own localStorage.
 */
test.describe('Lesson Lifecycle', () => {
  const testLessonTitle = `Test Lesson ${Date.now()}`;
  const editedTitle = `Edited ${testLessonTitle}`;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // Helper to navigate to Library view
  async function gotoLibrary(page: any) {
    await page.getByRole('button', { name: 'Plan', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Lesson library/i }).click();
    await page.waitForLoadState('networkidle');
  }

  // Helper to create a lesson and return its title
  async function createLesson(page: any, title: string, options: Partial<{ duration: string; objectives: string; materials: string }> = {}) {
    await page.getByRole('button', { name: /New Lesson Plan/i }).click();
    // Wait for modal to be fully visible
    await expect(page.getByRole('heading', { name: /Create New Lesson Plan/i })).toBeVisible();

    // Use stable selectors
    await page.getByPlaceholder('e.g. Introduction to Sorting').fill(title);
    // Duration input has no placeholder - use data-testid
    await page.getByTestId('lesson-duration').fill(options.duration || '45');
    // Objectives and Materials use data-testid
    await page.getByTestId('lesson-objectives').fill(options.objectives || 'Objective 1\nObjective 2');
    await page.getByTestId('lesson-materials').fill(options.materials || 'Whiteboard\nMarkers');
    await page.getByPlaceholder('e.g. Algorithms and Flowcharts').fill('Test topic');
    await page.getByTestId('lesson-hook').fill('Test hook content');
    await page.getByTestId('lesson-core').fill('Test core content');

    await page.getByRole('button', { name: /Save Lesson/i }).click();
    // Wait for modal to close
    await expect(page.getByRole('heading', { name: /Create New Lesson Plan/i })).not.toBeVisible({ timeout: 5000 });
  }

  test.describe('Create Lesson', () => {
    test('opens new lesson editor from Library view', async ({ page }) => {
      await gotoLibrary(page);

      // Click New Lesson Plan button
      await page.getByRole('button', { name: /New Lesson Plan/i }).click();

      // Verify editor modal opens
      await expect(page.getByRole('heading', { name: /Create New Lesson Plan/i })).toBeVisible();

      // Verify form fields are present using placeholders
      await expect(page.getByPlaceholder('e.g. Introduction to Sorting')).toBeVisible();
      await expect(page.getByPlaceholder('e.g. Algorithms and Flowcharts')).toBeVisible();
    });

    test('creates a new lesson and verifies it appears in Library', async ({ page }) => {
      await gotoLibrary(page);
      await createLesson(page, testLessonTitle);

      // Verify lesson appears in Library list
      await expect(page.getByText(testLessonTitle)).toBeVisible();

      // Verify lesson shows correct metadata
      const lessonCard = page.locator('text=' + testLessonTitle).locator('..');
      await expect(lessonCard.locator('text=45 min')).toBeVisible();
    });

    test('creates a new lesson and verifies it appears in Plan view', async ({ page }) => {
      await gotoLibrary(page);
      await createLesson(page, testLessonTitle);

      // Navigate to Plan view
      await page.getByRole('button', { name: 'Plan', exact: true }).click();
      await page.waitForLoadState('networkidle');

      // Verify the topic appears in Plan (lesson is under this topic)
      // The createLesson helper uses 'Test topic' as the topic title
      await expect(page.getByText('Test topic')).toBeVisible();

      // Verify Week 1 now shows 2 topics (the original + the new one)
      await expect(page.getByText('2 topic(s) outlined')).toBeVisible();
    });
  });

  test.describe('Edit Lesson', () => {
    test('opens existing lesson for editing from Library', async ({ page }) => {
      // First create a lesson
      await gotoLibrary(page);
      await createLesson(page, testLessonTitle);

      // Click Edit button for the lesson (first Edit button in the lesson card)
      await page.locator('text=' + testLessonTitle).locator('..').getByRole('button', { name: /Edit/i }).first().click();

      // Wait for editor to open in edit mode
      await expect(page.getByRole('heading', { name: /Edit Lesson Plan/i })).toBeVisible();

      // Verify fields are populated using placeholders
      await expect(page.getByPlaceholder('e.g. Introduction to Sorting')).toHaveValue(testLessonTitle);
      await expect(page.getByTestId('lesson-duration')).toHaveValue('45');
    });

    test('edits lesson title and saves changes', async ({ page }) => {
      // Create lesson first
      await gotoLibrary(page);
      await createLesson(page, testLessonTitle);

      // Edit the lesson
      await page.locator('text=' + testLessonTitle).locator('..').getByRole('button', { name: /Edit/i }).first().click();

      // Change title
      await page.getByPlaceholder('e.g. Introduction to Sorting').fill(editedTitle);

      // Save changes
      await page.getByRole('button', { name: /Save Lesson/i }).click();

      // Verify modal closes
      await expect(page.getByRole('heading', { name: /Edit Lesson Plan/i })).not.toBeVisible();

      // Verify updated title appears in Library
      await expect(page.getByText(editedTitle)).toBeVisible();
      // Original title should not appear as a separate lesson (use exact match to avoid substring collision)
      await expect(page.getByText(testLessonTitle, { exact: true })).not.toBeVisible();
    });

    test('edits lesson content and verifies changes persist after reload', async ({ page }) => {
      // Create lesson first
      await gotoLibrary(page);
      await createLesson(page, testLessonTitle);

      // Edit the lesson - change objectives
      await page.locator('text=' + testLessonTitle).locator('..').getByRole('button', { name: /Edit/i }).first().click();

      // Fill in the updated objectives
      await page.getByTestId('lesson-objectives').fill('Updated Objective 1\nUpdated Objective 2');
      await page.getByTestId('lesson-hook').fill('Updated hook content');
      await page.getByTestId('lesson-core').fill('Updated core content');

      await page.getByRole('button', { name: /Save Lesson/i }).click();

      // Reload the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Navigate to Library and open editor again
      await gotoLibrary(page);
      await page.locator('text=' + testLessonTitle).locator('..').getByRole('button', { name: /Edit/i }).first().click();

      // Verify updated objectives persisted
      await expect(page.getByTestId('lesson-objectives')).toHaveValue('Updated Objective 1\nUpdated Objective 2');
      await expect(page.getByTestId('lesson-hook')).toHaveValue('Updated hook content');
      await expect(page.getByTestId('lesson-core')).toHaveValue('Updated core content');

      // Close editor
      await page.getByRole('button', { name: /Cancel/i }).click();
    });
  });

  test.describe('Delete Lesson', () => {
    test('deletes lesson and verifies it disappears from Library and Plan', async ({ page }) => {
      // Create a lesson to delete
      const deleteTitle = `Delete Me ${Date.now()}`;

      await gotoLibrary(page);
      await createLesson(page, deleteTitle, { duration: '30', objectives: 'To be deleted' });

      // Verify lesson exists
      await expect(page.getByText(deleteTitle)).toBeVisible();

      // Delete the lesson - handle native confirm dialog
      page.once('dialog', dialog => dialog.accept());
      await page.locator('text=' + deleteTitle).locator('..').getByRole('button', { name: /Delete/i }).first().click();

      // Verify lesson disappears from Library
      await expect(page.getByText(deleteTitle)).not.toBeVisible();

      // Navigate to Plan and verify it's gone there too
      await page.getByRole('button', { name: 'Plan', exact: true }).click();
      await page.waitForLoadState('networkidle');

      await expect(page.getByText(deleteTitle)).not.toBeVisible();
    });

    test('delete confirms before removing', async ({ page }) => {
      // Create a lesson
      await gotoLibrary(page);
      const deleteTitle = `Cancel Delete ${Date.now()}`;
      await createLesson(page, deleteTitle, { duration: '20', objectives: 'Cancel test' });

      // Click Delete but cancel in confirmation - handle native confirm dialog
      page.once('dialog', dialog => dialog.dismiss());
      await page.locator('text=' + deleteTitle).locator('..').getByRole('button', { name: /Delete/i }).first().click();

      // Verify lesson still exists
      await expect(page.getByText(deleteTitle)).toBeVisible();
    });
  });
});