import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const base=process.argv[2] || 'http://127.0.0.1:4839/templates/';
const browser=await chromium.launch();
try {
 const context=await browser.newContext({viewport:{width:1360,height:950},permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage();
 for (const kind of ['connection','character']) {
  await page.goto(base+`#${kind}/source`);
  const section=page.getByRole('region',{name:'Preview and snippets'});
  await expect(section.locator('img')).toBeVisible();
  await expect.poll(()=>section.locator('img').evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBeGreaterThan(0);
  const choice=kind==='connection'?'Server connection':'JSON & code';
  await section.getByRole('button',{name:choice,exact:true}).click();
  await expect(section.getByRole('button',{name:choice,exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(section.locator('.cs-code-block .hljs-keyword').first()).toBeVisible();
  await section.getByRole('button',{name:/^Copy /}).click();
  await expect(section.locator('[role=status]')).toHaveText('Copied');
  const copied=await page.evaluate(()=>navigator.clipboard.readText());
  expect(copied).toContain(kind==='connection'?'CodexConnection':'JsonView');
  const image=await page.request.get(new URL((await section.locator('a').getAttribute('href'))!,base).href);
  expect(image.ok()).toBe(true); expect(image.headers()['content-type']).toContain('image/png');
  await mkdir('test-results/visuals',{recursive:true});
  await page.screenshot({path:`test-results/visuals/${kind}.png`});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.setViewportSize({width:1360,height:950});
 }
 console.log('Visual examples passed: image loading/enlargement URLs, snippet switching, highlighting, clipboard feedback, mobile layout.');
} finally { await browser.close(); }
