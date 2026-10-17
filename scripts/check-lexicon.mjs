import { readFileSync } from "node:fs";

/**
 * Source snapshot quality gate. These are licensed *reference* word lists,
 * not a vetted set of unique-answer translation exercises.
 */
const specs = [
  {level:"CET4",file:"public/lexicon/cet4.json",rows:7508,unique:4543},
  {level:"CET6",file:"public/lexicon/cet6.json",rows:5651,unique:3991},
];
const license = readFileSync("public/lexicon/LICENSE.txt","utf8");
if (!license.includes("BSD 3-Clause License") || !license.includes("Copyright (c) 2022-2026, KyleBing")) {
  throw Error("Missing upstream copyright/license notice");
}
for (const entry of specs) {
  const data = JSON.parse(readFileSync(entry.file,"utf8"));
  if (data.schema !== 1 || data.level !== entry.level ||
      data.source !== "KyleBing/english-vocabulary" ||
      data.license !== "BSD-3-Clause" ||
      data.rawRows !== entry.rows || data.uniqueWords !== entry.unique ||
      !Array.isArray(data.words) || data.words.length !== entry.unique) {
    throw Error(`Invalid ${entry.level} reference metadata`);
  }
  const seen=new Set();
  for(const item of data.words){
    if (!item || typeof item.word !== "string" || !/^[a-z][a-z' -]*$/u.test(item.word) ||
        seen.has(item.word) || !Array.isArray(item.glosses) || !item.glosses.length ||
        item.glosses.some(x=>typeof x!=="string"||!x.trim())) {
      throw Error(`Invalid or duplicate ${entry.level} entry: ${item?.word}`);
    }
    seen.add(item.word);
  }
  process.stdout.write(`✓ ${entry.level}: ${data.uniqueWords} unique headwords from ${data.rawRows} source rows\n`);
}
