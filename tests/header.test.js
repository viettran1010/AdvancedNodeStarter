const puppeteer = require('puppeteer')

let browser, page;

beforeEach(async ()=> {
    browser = await puppeteer.launch({
        headless: false 
     });
    page = await browser.newPage();
    await page.goto('localhost:3000')
})

afterEach(async()=> {
    // await browser.close();
})

test('Header text should be correct', async ()=> {
    const text = await page.$eval('a.brand-logo', el=> el.innerHTML);

    expect(text).toEqual('Blogster');
})

test('Clicking login starts oauth flow', async ()=> {
    await page.click('.right a');
    const url = page.url();
    expect(url).toMatch(/accounts\.google\.com/)
})

test.only('When signed in, shows logout button', async ()=> {
    const id = '601e68df61eb375cbded689e';
    const Buffer = require('safe-buffer').Buffer;
    
    const sessionObject = {
        passport: {
            user: id
        }
    }
    
    const sessionString = Buffer.from(
        JSON.stringify(sessionObject))
        .toString('base64');
        
        
    const Keygrip = require('keygrip');
    // const keygrip = new Keygrip();
    const keys = require('../config/keys');

    const kerygrip = new Keygrip([keys.cookieKey]);
    const sig = kerygrip.sign('session='+sessionString);

    await page.setCookie({name: 'session', value: sessionString})
    await page.setCookie({name: 'session.sig', value: sig})
    // console.log(sessionString, sig)
    await page.goto('localhost:3000');
})
