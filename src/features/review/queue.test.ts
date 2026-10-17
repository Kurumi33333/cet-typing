import { describe, expect, it } from "vitest";
import { getDueReviewIds, reviewOverview } from "./queue";
import { initialReviewCard } from "./scheduler";
import type { MistakeRecord, ReviewSchedule } from "../../lib/storage/db";

const makeMistake = (id: string, resolved = false): MistakeRecord => ({
  id, level:"CET4", lessonId:"cet4-01", wrongCount:1,
  lastAttempt:"oops", updatedAt:100, resolved,
});
const makeSchedule = (id:string, due:number): ReviewSchedule => ({
  id, level:"CET4", due, updatedAt:100, card:initialReviewCard(new Date(due)),
});

describe("FSRS due-date filtering and upgrade compatibility",()=>{
  it("keeps unresolved pre-FSRS mistakes immediately due",()=>{
    expect(getDueReviewIds([makeMistake("legacy")],[],1000)).toEqual(["legacy"]);
  });
  it("does not resurrect old resolved mistakes",()=>{
    expect(getDueReviewIds([makeMistake("learned",true)],[],1000)).toEqual([]);
  });
  it("correctly distinguishes due and future reviews",()=>{
    const items=[makeMistake("now",true),makeMistake("tomorrow",true)];
    const dates=[makeSchedule("now",900),makeSchedule("tomorrow",1500)];
    expect(getDueReviewIds(items,dates,1000)).toEqual(["now"]);
    expect(reviewOverview(items,dates,1000)).toEqual({due:1,later:1,total:2,nextDue:1500});
  });
  it("reports the nearest future review without confusing it with due work",()=>{
    const items=[makeMistake("a",true),makeMistake("b",true)];
    const dates=[makeSchedule("a",9000),makeSchedule("b",5000)];
    expect(reviewOverview(items,dates,1000)).toEqual({due:0,later:2,total:2,nextDue:5000});
    expect(reviewOverview([],[],1000).nextDue).toBeNull();
  });
  it("does not surface orphaned schedule IDs after content cleanup",()=>{
    expect(getDueReviewIds([], [makeSchedule("orphan",900)],1000)).toEqual([]);
  });
});
