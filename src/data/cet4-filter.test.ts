import { describe, expect, it } from "vitest";
import { candidateQuality, filterRecord } from "../../scripts/filter-cet4-jsonl.mjs";

describe("CET4 phrase/sentence candidate filter", () => {
  it("keeps short bilingual natural example and dedupes same wording", () => {
    const record={word:"education",phrases:[{phrase:"higher education",translation:"高等教育"}],sentences:[
      {sentence:"She also hopes her children will get a good education.",translation:"她也希望她的孩子可以受到良好的教育。"},
      {sentence:"She also hopes her children will get a good education.",translation:"同一个句子应被去重。"},
    ]};
    const accepted=filterRecord(record,new Set());
    expect(accepted).toHaveLength(2);
    expect(accepted[0].kind).toBe("phrase");
    expect(accepted[1].headword).toBe("education");
  });
  it("rejects dictionary artifacts, numeric claims, placeholders and excessive length", () => {
    expect(candidateQuality({sentence:"It's good (= nice) .",translation:"不错"})).toBeTruthy();
    expect(candidateQuality({sentence:"adapt to something",translation:"适应某事"})).toBeTruthy();
    expect(candidateQuality({sentence:"A total of 1000 people joined.",translation:"共有一千人参加。"})).toBeTruthy();
    expect(candidateQuality({sentence:"a",translation:"一个"})).toBeTruthy();
  });
  it("rejects missing or malformed Chinese translations",()=>{
    expect(candidateQuality({phrase:"higher education",translation:"college"})).toBeTruthy();
    expect(candidateQuality({phrase:"higher education",translation:""})).toBeTruthy();
    expect(candidateQuality({phrase:"higher education",translation:"高等教育"})).toBeNull();
  });
});
