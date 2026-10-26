import puppeteer from 'puppeteer-core';
const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--hide-scrollbars','--force-color-profile=srgb']});
const p=await b.newPage();
await p.setViewport({width:1440,height:900,deviceScaleFactor:2});
await p.goto('http://127.0.0.1:5199/lexicon/cet4',{waitUntil:'networkidle0',timeout:30000});
await new Promise(r=>setTimeout(r,1000));
const input = await p.$('input[type="search"], input[type="text"], input');
if (input) { await input.click(); await input.type('edu', {delay:60}); await new Promise(r=>setTimeout(r,1400)); }
console.log('after typing:', JSON.stringify(await p.evaluate(()=>({text:document.body.innerText.length, sample:document.body.innerText.slice(0,260)}))));
await p.screenshot({path:'out/qa/src/lex-srg.png'});
await b.close();
