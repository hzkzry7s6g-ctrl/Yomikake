import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const addBook = async (page: Page, title: string) => {
  await page.goto('/#/add');
  await page.getByPlaceholder('タイトル・著者・ISBN').fill(title);
  await page.getByRole('button', { name: new RegExp(`「${title}」で登録`) }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
};

const openDevice = async (browser: import('@playwright/test').Browser) => {
  const page = await (await browser.newContext()).newPage();
  await page.route(/googleapis|openbd/, (r) => r.fulfill({ json: { items: [] } }));
  return page;
};

test('端末Aで保存したファイルを端末Bで取り込むと記録が合体する', async ({ browser }) => {
  // 端末A: 本と人物を登録して iCloud へ保存(テスト環境では共有シートがないのでダウンロードになる)
  const a = await openDevice(browser);
  await addBook(a, '罪と罰');
  await a.getByRole('button', { name: '人物' }).click();
  await a.getByPlaceholder('例: ラスコーリニコフ').fill('ソーニャ');
  await a.getByPlaceholder('例: ラスコーリニコフ').press('Enter');
  await a.getByRole('button', { name: '完了' }).click();
  await a.goto('/');
  await a.getByRole('button', { name: 'iCloud で同期' }).first().click();
  const download = a.waitForEvent('download');
  await a.getByRole('button', { name: /iCloud へ保存/ }).click();
  const saved = await (await download).path();
  await expect(a.getByText(/最終同期:/)).toBeVisible();

  // 端末B: 別の本を登録してから取り込む
  const b = await openDevice(browser);
  await addBook(b, '白痴');
  await b.goto('/');
  await b.getByRole('button', { name: 'iCloud で同期' }).first().click();
  await b.locator('input[type=file]').setInputFiles({
    name: 'yomikake-sync.json',
    mimeType: 'application/json',
    buffer: await readFile(saved),
  });
  await expect(b.getByText(/取り込みました\(追加2/)).toBeVisible();
  await b.getByRole('button', { name: '閉じる' }).click();

  await expect(b.getByText('罪と罰')).toBeVisible();
  await expect(b.getByText('白痴')).toBeVisible();
  await b.getByText('罪と罰').click();
  await b.getByRole('tab', { name: /人物/ }).click();
  await expect(b.locator('.person')).toContainText('ソーニャ');
});
