import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',args:['--hide-scrollbars']});
const p=await b.newPage();
await p.setViewport({width:1920,height:1080,deviceScaleFactor:1});
for (const [n,u] of [['landing','http://127.0.0.1:5199/'],['practice','http://127.0.0.1:5199/app/cet4'],['review','http://127.0.0.1:5199/app/cet4/review']]) {
  await p.goto(u,{waitUntil:'networkidle0',timeout:30000}); await new Promise(r=>setTimeout(r,1500));
  await p.screenshot({path:`out/qa/v2/src-${n}.png`});
  console.log(n, await p.evaluate(()=>document.body.scrollHeight));
}
await b.close();
