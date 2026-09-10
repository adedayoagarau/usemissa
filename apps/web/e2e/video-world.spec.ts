import { test, expect } from "@playwright/test";

test("all video branches hold and reverse without competing playback", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/design-system/video-world');
  const world = page.locator('main');
  for (const label of ['Clothing', 'Scene', 'Lighting', 'Cast']) {
    await page.getByRole('button', {name: label, exact: true}).click();
    await expect(world).toHaveAttribute('data-phase', 'selected', {timeout: 20000});
    const held = await page.locator('video').evaluateAll(videos => videos.filter(v => (v as HTMLVideoElement).style.visibility === 'visible').map(v => ({paused:(v as HTMLVideoElement).paused,time:(v as HTMLVideoElement).currentTime})));
    expect(held).toHaveLength(1);
    expect(held[0].paused).toBe(true);
    expect(held[0].time).toBeGreaterThan(0);
    await page.getByRole('button', {name:'Reset', exact:true}).click();
    await expect(world).toHaveAttribute('data-phase','base',{timeout:20000});
    await expect(page.getByRole('button',{name:label,exact:true})).toBeEnabled();
    expect(await page.locator('video').evaluateAll(videos => videos.filter(v => !(v as HTMLVideoElement).paused).length)).toBe(0);
  }
});
