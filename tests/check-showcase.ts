import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const base=process.argv[2] || 'http://127.0.0.1:4839/templates/';
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:1360,height:950}});
 const failures:string[]=[]; const requests:string[]=[];
 page.on('pageerror',e=>failures.push(e.message));
 page.on('request',r=>requests.push(r.url()));
 await page.goto(base);
 await expect(page.getByRole('heading',{name:'A starting point for your next app.'})).toBeVisible();
 await expect(page.locator('code').first()).toContainText(new URL('install/codex-connection.md',base).href);
 await page.getByRole('link',{name:'Open demo →'}).first().click();
 await expect(page.getByText('Interactive mock demo.',{exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'Source',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Sign in with Codex — source'})).toBeVisible();
 await page.goto(base+'#character');
 await expect(page.getByRole('heading',{name:'Create your character'})).toBeVisible();
 await page.getByRole('button',{name:'Run locally',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Run this demo on your Mac'})).toBeVisible();
 await page.getByRole('button',{name:'Style example',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Create your style'})).toBeVisible();
 for(const name of ['codex-connection','chat-step','example']) {
  const response=await page.request.get(new URL(`install/${name}.md`,base).href);
  expect(response.ok()).toBe(true); expect(await response.text()).toContain('#'); expect(await response.text()).not.toContain('<!doctype');
 }
 expect(requests.filter(url=>new URL(url).pathname.startsWith('/api/'))).toEqual([]);
 expect(failures).toEqual([]);
 await page.goto(base);
 await mkdir('test-results/showcase',{recursive:true});
 await page.screenshot({path:'test-results/showcase/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/showcase/mobile.png',fullPage:true});
 console.log('Showcase passed: gallery, tabs, previews, install guides, no backend requests, mobile layout.');
} finally {await browser.close();}
