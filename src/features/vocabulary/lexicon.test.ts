import { describe, expect, it } from "vitest";
import { findLexiconEntries, validateLexicon } from "./lexicon";

const raw = {
  schema: 1, level: "CET4", source: "KyleBing/english-vocabulary",
  license: "BSD-3-Clause", rawRows: 3, uniqueWords: 3,
  words: [
    {word:"like",glosses:["喜欢"]},
    {word:"likewise",glosses:["同样地"]},
    {word:"water",glosses:["水"]},
  ],
};

describe("licensed reference vocabulary",()=>{
  it("validates static vocab schema and level",()=>{
    expect(validateLexicon(raw,"CET4").uniqueWords).toBe(3);
    expect(()=>validateLexicon(raw,"CET6")).toThrow();
  });
  it("prioritizes English prefix and searches Chinese meanings",()=>{
    const d=validateLexicon(raw,"CET4");
    expect(findLexiconEntries(d,"lik").map(x=>x.word)).toEqual(["like","likewise"]);
    expect(findLexiconEntries(d,"水").map(x=>x.word)).toEqual(["water"]);
    expect(findLexiconEntries(d," ")).toEqual([]);
  });
  it("caps result counts and rejects corrupt entries",()=>{
    const d=validateLexicon(raw,"CET4");
    expect(findLexiconEntries(d,"li",1)).toHaveLength(1);
    expect(()=>validateLexicon({...raw,words:[{word:"bad",glosses:[]}]}, "CET4")).toThrow();
  });
});
