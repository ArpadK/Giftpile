import { chromium } from 'playwright';
import fs from 'fs';

const VIEWPORT_WIDTH = 375;
const VIEWPORT_HEIGHT = 812;
const MIN_TOUCH_TARGET = 44;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
  deviceScaleFactor: 2,
});

const findings = {
  screens: {},
  modals: {},
  issues: [],
};

// Test function to check layout and touch targets
async function checkLayout(name, path) {
  console.log(`\n🔍 Checking ${name}...`);
  try {
    await page.goto(`http://localhost:5175${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500); // Let animations settle

    // Check for horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    if (bodyWidth > VIEWPORT_WIDTH) {
      findings.issues.push(`❌ ${name}: Horizontal overflow detected (${bodyWidth}px > ${VIEWPORT_WIDTH}px)`);
    }

    // Check for buttons and clickable elements with insufficient touch targets
    const elements = await page.evaluate((minTarget) => {
      const items = [];
      const selectors = ['button', 'a[href]', '[role="button"]', 'input[type="checkbox"]', 'input[type="radio"]'];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const rect = el.getBoundingClientRect();
          const width = rect.width;
          const height = rect.height;

          if (width > 0 && height > 0) {
            const isVisible = el.offsetParent !== null;
            items.push({
              tag: el.tagName,
              text: el.textContent?.trim().substring(0, 30) || '(empty)',
              width: Math.round(width),
              height: Math.round(height),
              minDimension: Math.min(Math.round(width), Math.round(height)),
              isVisible,
              class: el.className,
              id: el.id,
            });
          }
        });
      });

      return items;
    }, MIN_TOUCH_TARGET);

    // Filter for elements with insufficient touch targets (both dimensions < 44px)
    const smallTargets = elements.filter(e => e.minDimension < MIN_TOUCH_TARGET && e.isVisible);

    if (smallTargets.length > 0) {
      findings.issues.push(`⚠️ ${name}: ${smallTargets.length} element(s) with touch targets < 44px:`);
      smallTargets.slice(0, 5).forEach(el => {
        findings.issues.push(`   - ${el.tag}: ${el.width}×${el.height}px | ${el.text}`);
      });
    }

    // Take screenshot
    const screenshotPath = `/tmp/mobile-${name.replace(/\s+/g, '-').toLowerCase()}.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`✅ ${name} checked | Screenshot: ${screenshotPath}`);

    findings.screens[name] = {
      bodyWidth,
      elementCount: elements.length,
      smallTargets: smallTargets.length,
      screenshotPath,
    };
  } catch (error) {
    findings.issues.push(`❌ ${name}: ${error.message}`);
    console.log(`❌ ${name}: ${error.message}`);
  }
}

// Test screens
console.log('Testing 6 Screens...');
await checkLayout('UserSelect', '/');
await checkLayout('PasswordStep', '/password'); // Adjust if needed
await checkLayout('Home', '/home');
await checkLayout('GiftList (My List)', '/my-list');
await checkLayout('GiftList (Other Member)', '/list/test-user');
await checkLayout('AdminPanel', '/admin');

// Test modals - we need to trigger them
console.log('\n\nTesting Modals...');

// For modals, we need to navigate to a page where they can be triggered
// Let's go to my-list and try to open modals
await page.goto('http://localhost:5175/my-list', { waitUntil: 'networkidle' });

// Try clicking an "Add Gift" button to open GiftFormModal
try {
  const addButton = await page.locator('button:has-text("Add Gift"), button:has-text("add")').first();
  if (await addButton.isVisible()) {
    await addButton.click();
    await page.waitForTimeout(300);
    findings.modals['GiftFormModal'] = { triggered: true };
    const path = `/tmp/mobile-giftformmodal.png`;
    await page.screenshot({ path });
    console.log(`✅ GiftFormModal screenshot: ${path}`);
  }
} catch (e) {
  findings.modals['GiftFormModal'] = { triggered: false, error: e.message };
}

// Try claim/give button for ClaimModal
try {
  const claimButton = await page.locator('button:has-text("Claim"), button:has-text("Give")').first();
  if (await claimButton.isVisible()) {
    await claimButton.click();
    await page.waitForTimeout(300);
    findings.modals['ClaimModal'] = { triggered: true };
    const path = `/tmp/mobile-claimmodal.png`;
    await page.screenshot({ path });
    console.log(`✅ ClaimModal screenshot: ${path}`);
  }
} catch (e) {
  findings.modals['ClaimModal'] = { triggered: false, error: e.message };
}

console.log('\n\n=== FINDINGS ===');
console.log(JSON.stringify(findings, null, 2));

fs.writeFileSync('/tmp/mobile-layout-findings.json', JSON.stringify(findings, null, 2));
console.log('\nDetailed findings saved to: /tmp/mobile-layout-findings.json');

await browser.close();
