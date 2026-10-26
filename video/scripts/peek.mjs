import puppeteer from 'puppeteer-core';
const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--hide-scrollbars','--force-color-profile=srgb']});
const p=await b.newPage();
await p.setViewport({width:1440,height:900,deviceScaleFactor:2});
for (const [name,url] of [['course','http://127.0.0.1:5199/app/cet4'],['lexicon','http://127.0.0.1:5199/lexicon/cet4'],['review','http://127.0.0.1:5199/app/cet4/review']]) {
  await p.goto(url,{waitUntil:'networkidle0',timeout:30000});
  await new Promise(r=>setTimeout(r,1200));
  await p.screenshot({path:`out/qa/src/${name}.png`,fullPage:false});
  const info=await p.evaluate(()=>({h:document.body.scrollHeight,text:document.body.innerText.length}));
  console.log(name, JSON.stringify(info));
}
await b.close();
