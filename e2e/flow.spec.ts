import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // 外部の書籍検索はテストでは使わない
  await page.route('**/www.googleapis.com/**', (r) => r.fulfill({ json: { items: [] } }));
  await page.route('**/api.openbd.jp/**', (r) => r.fulfill({ json: [null] }));
});

test('本の登録からメモ・人物・関係・ネタバレ防止まで', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '＋ 最初の本を追加' }).click();

  // タイトルだけで登録
  await page.getByPlaceholder('タイトル・著者・ISBN').fill('罪と罰');
  await page.getByRole('button', { name: /「罪と罰」で登録/ }).click();
  await expect(page.getByRole('heading', { name: '罪と罰' })).toBeVisible();

  // 人物を2人、名前だけで連続追加(p.0 で登場)
  await page.getByRole('button', { name: '人物' }).click();
  const name = page.getByPlaceholder('例: ラスコーリニコフ');
  await name.fill('ラスコーリニコフ');
  await name.press('Enter');
  await name.fill('ソーニャ');
  await name.press('Enter');
  await page.getByRole('button', { name: '完了' }).click();
  await expect(page.locator('.person')).toHaveCount(2);

  // +10ページ は1タップ
  await page.getByRole('button', { name: '＋10 ページ' }).click();
  await expect(page.locator('.book-header .progress-text')).toHaveText('p.10');

  // しおりは2タップ(メモ → 🔖)
  await page.getByRole('button', { name: '🔖 メモ' }).click();
  await page.getByRole('button', { name: /しおり/ }).click();
  await expect(page.getByText('p.10 に残しました')).toBeVisible();

  // 関係は3タップ(人物A → 人物B → チップ)。p.10 で判明として記録される
  await page.locator('.person', { hasText: 'ラスコーリニコフ' }).click();
  await page.locator('.person', { hasText: 'ソーニャ' }).click();
  await page.getByRole('button', { name: '恋人', exact: true }).click();
  await expect(page.locator('.person', { hasText: 'ラスコーリニコフ' })).toContainText('ソーニャの恋人');

  // 相関図に線とラベルが出る
  await page.getByRole('tab', { name: '相関図' }).click();
  await expect(page.locator('.graph-label')).toHaveText('恋人');

  // ページを p.5 に戻すと、p.10 で判明した関係は隠れる
  await page.getByRole('button', { name: '📍 ここまで' }).click();
  await page.getByLabel('ページ', { exact: true }).fill('5');
  await page.getByRole('button', { name: '記録する' }).click();
  await expect(page.locator('.graph-label')).toHaveCount(0);
  await expect(page.getByText(/1件を隠しています/)).toBeVisible();

  // 「表示する」で一時的に見られる
  await page.getByRole('button', { name: '表示する' }).click();
  await expect(page.locator('.graph-label')).toHaveText('恋人');

  // ホームに戻ると「いま読んでいる本」に出ていて、記録は再読み込み後も残る
  await page.reload();
  await page.getByRole('button', { name: '戻る' }).click();
  await expect(page.locator('.hero')).toContainText('罪と罰');
  await expect(page.locator('.hero .progress-text')).toHaveText('p.5');
});
