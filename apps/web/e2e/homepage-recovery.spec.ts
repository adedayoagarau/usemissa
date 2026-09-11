import {test,expect,devices} from '@playwright/test';
for(const width of [1440,390]) test(`recovered homepage ${width}`,async({browser})=>{
 const context=await browser.newContext(width===390?{...devices['iPhone 13']}:{viewport:{width,height:1000}});
 const page=await context.newPage();const errors:string[]=[];
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/design-system/discovery-journey/home');
 await expect(page.getByRole('heading',{name:'Opportunities and grants for every creator'})).toBeVisible();
 await expect(page.locator('img[src*="knit-h1"]').first()).toBeAttached();
 await page.locator('#homepage-hero-heading').scrollIntoViewIfNeeded();
 await page.screenshot({path:`/private/tmp/missa-recovered-home-${width}.png`,fullPage:true});
 console.log(JSON.stringify({width,errors}));
 expect(errors.filter(e=>/hydrat|didn't match|server rendered/i.test(e))).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await context.close();
});
test('current account screens are reused without writes',async({page})=>{
 const writes:string[]=[];page.on('request',r=>{if(r.method()==='POST'&&/api\/(auth|me\/onboarding)/.test(r.url()))writes.push(r.url())});
 await page.goto('/design-system/discovery-journey/signup');
 await expect(page.locator('#email')).toBeVisible();
 await page.locator('button[type=submit]').click();
 await expect(page).toHaveURL(/personalization/);
 await page.getByRole('button',{name:'Skip setup'}).click();
 await expect(page.getByText('Your declared preferences')).toBeVisible();
 expect(writes).toEqual([]);
 await page.screenshot({path:'/private/tmp/missa-recovered-onboarding.png',fullPage:true});
});
