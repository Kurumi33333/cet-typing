import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import type { CetLevel } from "../features/course/types";
import type { StudyProgress } from "../lib/storage/db";
import type { ReviewOverview } from "../features/review/queue";
import {
  AUDIO_FEEDBACK_COUNT, LEXICON_SIZE, LEXICON_SOURCE, LEVEL_FACTS, TOTAL_LESSONS, TOTAL_STEPS,
} from "../data/landingFacts";
import Aurora from "../components/reactbits/Aurora";
import { landingSound } from "./landingSound";
import { useLandingSound } from "./useLandingSound";
import { SoundGate, useGateOpen } from "./SoundGate";
import { HeroTyper } from "./HeroTyper";
import { TrySentence } from "./TrySentence";
import { useLandingScroll } from "./useLandingScroll";
import { useLandingMotion } from "./useLandingMotion";
import { useClipCalm } from "./useClipCalm";

export interface LandingProps {
  onStartLevel: (level: CetLevel) => void;
  onOpenApp: () => void;
  onOpenLexicon: (level: CetLevel) => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
  onStartReview: (level: CetLevel) => void;
  busy: CetLevel | null;
  maintenance: boolean;
  positions: Partial<Record<CetLevel, StudyProgress>>;
  review: Record<CetLevel, ReviewOverview>;
  notice: string;
}

const PIC = {
  class: { src: "/landing/hero-class.jpg", width: 1200, height: 750 },
  typewriter: { src: "/landing/hero-typewriter.jpg", width: 1200, height: 675 },
  plate: { src: "/landing/plate-quail.jpg", width: 900, height: 675 },
  dictionary: { src: "/landing/dict-pages.jpg", width: 900, height: 675 },
  remington: { src: "/landing/remington.jpg", width: 900, height: 675 },
  poster: { src: "/landing/typing-poster.jpg", width: 1200, height: 750 },
} as const;

const CREDITS = [
  {
    title: "Geography class, Affiliated High School of Taiwan Provincial Normal School",
    creator: "國立臺灣師範大學附屬高級中學校友會",
    licence: "public domain",
    href: "https://commons.wikimedia.org/wiki/File:Geography_Class_in_the_Affiliated_High_School_of_Taiwan_Provincial_Normal_School.jpg",
  },
  {
    title: "Chinese typewriter",
    creator: "Dadiolli / Tilman Schalmey",
    licence: "CC BY-SA 3.0",
    liHref: "https://creativecommons.org/licenses/by-sa/3.0/",
    href: "https://commons.wikimedia.org/w/index.php?curid=5811787",
  },
  {
    title: "Writing and drawing made easy, amusing and instructive, 1750",
    creator: "Internet Archive Book Images",
    licence: "no known copyright restrictions",
    href: "https://commons.wikimedia.org/wiki/File:Writing_and_drawing_made_easy,_amusing_and_instructive_-_containing_the_whole_alphabet_in_all_the_characters_now_us%27d,_both_in_printing_and_penmanship_-_each_illustrated_by_emblematic_devices_and_(14750984595).jpg",
  },
  {
    title: "An analytical Chinese-English dictionary, 1900",
    creator: "Baller, F. W.",
    licence: "no known copyright restrictions",
    href: "https://commons.wikimedia.org/wiki/File:An_analytical_Chinese-English_dictionary_(1900)_(14597036350).jpg",
  },
  {
    title: "Remington typewriter, 1907",
    creator: "Gianni Careddu",
    licence: "CC BY-SA 4.0",
    liHref: "https://creativecommons.org/licenses/by-sa/4.0/",
    href: "https://commons.wikimedia.org/w/index.php?curid=63103660",
  },
  {
    title: "Typewriter Optima M12, typing (footage)",
    creator: "Sounds of Changes",
    licence: "CC BY 3.0",
    liHref: "https://creativecommons.org/licenses/by/3.0/",
    href: "https://commons.wikimedia.org/wiki/File:Typewriter_Optima_M12_-_typing.webm",
  },
];

const FAQ = [
  {
    q: "这些句子是四六级真题吗？",
    a: "不是。练习是按词、语块、句子三级自己编写的，用来把输出这一步练顺；题目不是官方真题，也不预测分数。",
  },
  {
    q: "能像考试一样整段翻译吗？",
    a: "还不能。四六级翻译考的是段落汉译英，这里练的是它前面的基本功：把一个词、一个语块、一句完整的话准确打出来。",
  },
  {
    q: "要注册吗，记录存在哪里？",
    a: "不用注册，没有账号，也没有云端同步。进度、错题和复习卡都存在当前浏览器的 IndexedDB 里，换设备要自己导出再导入。",
  },
  {
    q: "手机上中文输入法抢字母怎么办？",
    a: "练习页在触屏设备上自带一套网页英文键盘，点字母直接录入，不经过系统输入法。电脑上直接读取物理键位，拼音输入法开着也能打出字母。",
  },
  {
    q: "发音用的是什么？",
    a: "调用浏览器自带的英语语音合成，没有音频文件，也没有模型调用。读单词和整句，音色取决于系统里装了哪套英语语音，可以随时关掉。",
  },
  {
    q: "错题为什么过几天又出现？",
    a: "错题会进入到期队列，用 FSRS 按你第一次独立回忆的结果安排下一次：答对推远，答错拉回。这是间隔复习，不是打卡。",
  },
];

function Photo({
  picture, alt, className, style, eager = false,
}: {
  picture: { src: string; width: number; height: number };
  alt: string;
  className?: string;
  style?: CSSProperties;
  eager?: boolean;
}) {
  return (
    <img
      className={className}
      src={picture.src}
      width={picture.width}
      height={picture.height}
      alt={alt}
      style={style}
      loading={eager ? undefined : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      decoding="async"
    />
  );
}

export function Landing(props: LandingProps) {
  const { onStartLevel, onOpenApp, onOpenLexicon, onExport, onImport, onReset, onStartReview } = props;
  const scopeRef = useRef<HTMLElement>(null);
  useLandingScroll(scopeRef);
  useLandingMotion(scopeRef);
  useClipCalm();
  useLandingSound(scopeRef);
  const gateInitially = useGateOpen();
  const [gated, setGated] = useState(gateInitially);
  const soundOn = useSyncExternalStore(landingSound.subscribe, landingSound.isOn, () => true);

  const levelFacts = [LEVEL_FACTS.CET4, LEVEL_FACTS.CET6];
  const dueTotal = props.review.CET4.due + props.review.CET6.due;
  const nextDue = [props.review.CET4.nextDue, props.review.CET6.nextDue]
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b)[0];
  const resume = props.positions.CET4 ?? props.positions.CET6;
  const hasRecords = Boolean(props.positions.CET4 || props.positions.CET6) || dueTotal > 0;
  const nextDueLabel = nextDue
    ? new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(nextDue))
    : "还没有预约";

  return (
    <main className="landing" id="top" ref={scopeRef} data-gated={gated ? "1" : undefined}>
      {gated && <SoundGate onDone={() => setGated(false)} />}
      <header className="landing__nav">
        <div className="wrap landing__nav-inner">
          <a className="landing__brand" href="#top" aria-label="CET Typing 首页">
            CET<span>Typing</span>
          </a>
          <nav className="landing__links" aria-label="页面导航">
            <a href="#try">试一句</a>
            <a href="#how">怎么练</a>
            <a href="#source">内容</a>
            <a href="#faq">常见问题</a>
          </nav>
          <button type="button" className="landing__sound" data-silent aria-pressed={soundOn}
            onClick={() => landingSound.setOn(!soundOn)}>
            <span className="landing__sound-bars" aria-hidden="true"><i /><i /><i /></span>
            音效 {soundOn ? "开" : "关"}
          </button>
          <button type="button" className="landing__nav-action" onClick={onOpenApp}>
            练习台
          </button>
        </div>
      </header>

      <div className="landing__progress" aria-hidden="true" />

      {/* 01 · the claim, with the thing it describes happening under it. */}
      <section className="hero" data-panel aria-labelledby="hero-title">
        <div className="hero__aurora" aria-hidden="true">
          <Aurora colorStops={["#7fe3bf", "#6bc3e6", "#a5b4f5", "#9be8b0"]}
            lightMode amplitude={1.5} blend={0.7} speed={0.9} height={0.8}
            scale={1.1} glow={1.1} brightness={1.15} layers={3} opacity={0.9} dpr={1.1} />
        </div>
        <div className="wrap hero__inner">
          <p className="hero__eyebrow" data-rise>CET-4 / CET-6 · 中译英基本功</p>
          <h1 className="hero__stage" id="hero-title">
            <span className="hero__half" data-rise>看中文，</span>
            <span className="hero__frame" aria-hidden="true">
              <img src={PIC.class.src} alt="" width={PIC.class.width} height={PIC.class.height} decoding="async" fetchPriority="high" />
            </span>
            <span className="hero__half" data-rise>写英文。</span>
          </h1>
          <div data-rise><HeroTyper /></div>
          <p className="hero__support" data-rise>
            四六级的中译英，卡住的常常不是不认识词，是写不出来。这一页只练这一件事：
            看一句中文，把英文一个词一个词打出来，打完才算过。
          </p>
          <div className="hero__actions" data-rise>
            <button type="button" className="btn btn--solid btn--big"
              onClick={() => onStartLevel("CET4")}>
              开始四级
            </button>
            <button type="button" className="btn btn--ghost btn--big" onClick={() => onStartLevel("CET6")}>
              从六级开始
            </button>
            <a className="landing-link" href="#try">先试一句 ↓</a>
          </div>
          <p className="hero__meta" data-rise>不用注册，记录只留在这台设备，断网也能继续。</p>
        </div>
      </section>

      <div className="ticker" aria-hidden="true">
        <div className="ticker__track">
          {Array.from({ length: 2 }, (_, copy) => (
            <span className="ticker__row" key={copy}>
              {["WORD", "PHRASE", "SENTENCE", "单词", "语块", "句子", "TYPE IT", "写出来"].map((word) => (
                <span key={word}>{word}<i /></span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <section className="stats" data-panel aria-label="课程规模">
        <div className="wrap stats__grid">
          {[
            { n: TOTAL_LESSONS, label: "个单元" },
            { n: TOTAL_STEPS, label: "步原创练习" },
            { n: LEXICON_SIZE.CET4 + LEXICON_SIZE.CET6, label: "条词库可查" },
            { n: AUDIO_FEEDBACK_COUNT, label: "类键音反馈" },
          ].map((item) => (
            <div className="stats__item" key={item.label} data-reveal>
              <strong data-count={item.n}>{item.n.toLocaleString("zh-CN")}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <figure className="hero__filmwrap" data-panel>
        <video
          className="hero__film"
          data-clip
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={PIC.poster.src}
          width={PIC.poster.width}
          height={PIC.poster.height}
          aria-label="俯拍：一个人在一台老式打字机上连续打字，纸上逐行出现文字"
        >
          <source src="/landing/typing.webm" type="video/webm" />
        </video>
        <figcaption className="wrap">
          从两个词的短句练到 {LEVEL_FACTS.CET4.maxWordsInSentence} 个词的长句。上面这段是库里的一段打字机实拍。
        </figcaption>
      </figure>

      {/* 02 · the live thing: one screen, the card and its sentence. */}
      <TrySentence
        onStart={() => onStartLevel("CET4")}
        onOpenLexicon={() => onOpenLexicon("CET4")}
        nextDueLabel={nextDueLabel}
        dueTotal={dueTotal}
        review={props.review}
        busy={props.busy}
        onStartReview={onStartReview}
      />

      {/* 03 · how the course is built */}
      <section className="wrap how" id="how" data-panel aria-labelledby="how-title">
        <h2 className="statement" id="how-title" data-reveal>
          一个词，一块砖，一句话。
        </h2>
        <p className="lead" data-reveal>
          每个单元都走同一段路：先打认识的单词，再把它们拼成语块，最后拼成一句完整的话。
          第几题打什么，单元里已经排好了。
        </p>

        <div className="how__grid">
          <ol className="how__steps">
            {levelFacts.map((facts) => (
              <li className="how__level" key={facts.level} data-reveal>
                <div className="how__level-head">
                  <h3 className="how__level-name">{facts.label}</h3>
                  <span className="how__level-meta">{facts.lessons} 个单元，{facts.steps} 步</span>
                  <button type="button" className="landing-link" onClick={() => onStartLevel(facts.level)}>
                    练{facts.label}
                  </button>
                </div>
                <div className="how__bars" aria-hidden="true">
                  <span className="how__bar how__bar--word" style={{ "--share": `${Math.round((facts.wordSteps / facts.steps) * 100)}%` } as CSSProperties}>
                    <span>单词 {facts.wordSteps}</span>
                  </span>
                  <span className="how__bar how__bar--phrase" style={{ "--share": `${Math.round((facts.phraseSteps / facts.steps) * 100)}%` } as CSSProperties}>
                    <span>语块 {facts.phraseSteps}</span>
                  </span>
                  <span className="how__bar how__bar--sentence" style={{ "--share": `${Math.round((facts.sentenceSteps / facts.steps) * 100)}%` } as CSSProperties}>
                    <span>句子 {facts.sentenceSteps}</span>
                  </span>
                </div>
              </li>
            ))}
          </ol>

          <aside className="how__aside" data-reveal aria-label="练习时的反馈">
            <h3 className="how__aside-title">打对的那一刻</h3>
            <p>
              那个词会用系统自带的英语声音读一遍；整句答对后可以手动听全句。
              键音有 {AUDIO_FEEDBACK_COUNT} 类，各不相同，都能单独关掉。
            </p>
            <p className="how__aside-note">
              打错的词原位标红，改成对的再按回车；点哪一个词槽都能改，没有必须从左到右填的门槛。
            </p>
            {resume && (
              <button type="button" className="landing-link how__resume" onClick={() => onStartLevel(resume.level)}>
                上次停在《{resume.lessonId}》，接着打
              </button>
            )}
          </aside>
        </div>
      </section>

      {/* 04 · the corpus, on the one dark field */}
      <section className="source" id="source" data-panel aria-labelledby="source-title">
        <div className="wrap source__layout">
          <div className="source__pinned">
            <h2 className="statement statement--field" id="source-title" data-reveal>
              课程原创，词库引用。
            </h2>
            <p className="source__lead" data-reveal>
              练习句子是原创建课，按词到句排的，不冒充官方真题。查词用的两份参考词库来自公开的开源项目，
              {LEXICON_SIZE.CET4.toLocaleString("zh-CN")} + {LEXICON_SIZE.CET6.toLocaleString("zh-CN")} 条，
              保留完整授权和来源。
            </p>
          </div>

          <div className="source__proofs">
            <article className="source__proof" data-reveal>
              <Photo picture={PIC.remington} alt="1907 年的雷明顿打字机，滚筒上还夹着打好的一页纸" />
              <div>
                <h3>原创练习，{TOTAL_STEPS} 步</h3>
                <p>{TOTAL_LESSONS} 个单元排成同一段路：单词、语块、句子。每一步都过了自动检查，但还没有逐句请老师复核。</p>
              </div>
            </article>

            <article className="source__proof source__proof--flip" data-reveal>
              <Photo picture={PIC.dictionary} alt="1900 年一本汉英词典的正文，词条后面标着页码" />
              <div>
                <h3>参考词库，{LEXICON_SIZE.CET4.toLocaleString("zh-CN")} + {LEXICON_SIZE.CET6.toLocaleString("zh-CN")}</h3>
                <p>
                  按英文或中文释义检索，可点喇叭听发音。词库按需加载。
                  <a href={LEXICON_SOURCE.url} target="_blank" rel="noopener noreferrer">{LEXICON_SOURCE.name}</a>
                  ，{LEXICON_SOURCE.license}。不当作官方词纲。
                </p>
                <p className="source__proof-actions">
                  <button type="button" className="landing-link" onClick={() => onOpenLexicon("CET4")}>查四级</button>
                  <button type="button" className="landing-link" onClick={() => onOpenLexicon("CET6")}>查六级</button>
                </p>
              </div>
            </article>

            <article className="source__proof" data-reveal>
              <Photo picture={PIC.plate} alt="1750 年写字手册里的字母 Q 插图，边框里画着捕鹌鹑的场景" />
              <div>
                <h3>发音与拼写都在本地</h3>
                <p>发音用浏览器自带的英语语音合成；判错按词比对，拼错的词标红并保留你写的内容。不发请求。</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 05 · spacing, the second half of the loop */}
      <section className="wrap spacing" data-panel aria-labelledby="spacing-title">
        <h2 className="statement statement--wide" id="spacing-title" data-reveal>
          隔得越久，越要自己想。
        </h2>
        <div className="spacing__body">
          <div className="spacing__copy" data-reveal>
            <p>
              错题不会一次性消失。它先进入到期队列；复习时只按你第一次独立回忆的结果评分，
              答对推远，答错拉回，中间改拼写不算第二次答对。
            </p>
            <p>所以第二天会再见到它，一周后再见到，很久以后再见到一次。间隔是算出来的，不是靠复习次数堆出来的。</p>
          </div>

          <div className="spacing__panel" data-reveal data-ui>
            <div className="spacing__panel-head">
              <span className="spacing__panel-title">到期复习</span>
              <span className="spacing__panel-date">{nextDueLabel}</span>
            </div>
            {(["CET4", "CET6"] as const).map((item) => (
              <div className="spacing__panel-row" key={item}>
                <span className="spacing__panel-label">{item === "CET4" ? "四级" : "六级"}</span>
                <span className="spacing__panel-value">{props.review[item].due}</span>
                <span className="spacing__panel-sub">未来 {props.review[item].later}</span>
                <button
                  type="button"
                  className="spacing__panel-button"
                  disabled={props.busy !== null || props.review[item].due === 0}
                  onClick={() => onStartReview(item)}
                >
                  {props.review[item].due > 0 ? "开始复习" : "无到期"}
                </button>
              </div>
            ))}
            <p className="spacing__panel-note">
              {hasRecords ? "数字来自这台浏览器里的真实记录。" : "还没有本地记录，所以两项都是 0。"}
            </p>
          </div>
        </div>

        <ol className="spacing__list" data-reveal aria-label="答对一次后这张卡的下一次到期">
          {[
            { when: "第 2 次", gap: "2 天后", note: "第一次答对之后" },
            { when: "第 3 次", gap: "11 天后", note: "仍然记得" },
            { when: "第 4 次", gap: "46 天后", note: "隔了一个多月" },
            { when: "第 5 次", gap: "163 天后", note: "半年后再见" },
          ].map((step) => (
            <li className="spacing__step" key={step.when}>
              <strong>{step.gap}</strong>
              {step.when} · {step.note}
            </li>
          ))}
        </ol>
        <p className="spacing__footnote" data-reveal>
          间隔来自 FSRS 的默认参数，会随你的每次作答变化；上面是连续答对时的常见节奏，不是承诺。
        </p>
      </section>

      {/* 06 · the record and the questions share one screen */}
      <section className="facts" data-panel aria-labelledby="facts-title">
        <div className="facts__grid">
        <div className="facts__col">
          <h2 className="statement" id="facts-title" data-reveal>
            记录不会自己跟过去。
          </h2>
          <p className="facts__copy" data-reveal>
            进度、错题和复习卡都存在这台设备的 IndexedDB 里。没有账号，也就没有云端同步。
          </p>
          <ul className="facts__points" data-reveal>
            <li>备份是纯 JSON：课程断点、错题次数、FSRS 复习卡都在里面。</li>
            <li>导入前先校验结构，损坏的文件不会写进本地记录。</li>
            <li>同一条记录冲突时，保留更新时间较新的那一版。</li>
            <li>清理浏览器数据会连同记录一起消失，建议先导出。</li>
          </ul>
          <div className="record__tools" data-reveal>
            <button type="button" className="btn btn--fill" disabled={props.maintenance} onClick={onExport}>
              导出备份
            </button>
            <button type="button" className="btn btn--fill" disabled={props.maintenance} onClick={onImport}>
              导入备份
            </button>
            <button type="button" className="landing-link record__danger" disabled={props.maintenance} onClick={onReset}>
              清空本机记录
            </button>
          </div>
          {props.notice && <p className="record__notice" role="status">{props.notice}</p>}
        </div>

        <div className="faq__list" id="faq" data-reveal>
          {FAQ.map((item) => (
            <details className="faq__item" key={item.q}>
              <summary>
                <span>{item.q}</span>
                <span className="faq__mark" aria-hidden="true" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
        </div>
      </section>

      {/* 07 · the close */}
      <section className="closing" data-panel aria-labelledby="closing-title">
        <div className="wrap">
          <h2 className="statement closing__title" id="closing-title" data-reveal>
            每天十分钟，
            <span className="closing__frame" aria-hidden="true">
              <img src={PIC.class.src} alt="" width={PIC.class.width} height={PIC.class.height} loading="lazy" decoding="async" />
            </span>
            多留几行。
          </h2>
          <div className="closing__actions" data-reveal>
            <button type="button" className="btn btn--solid" onClick={() => onStartLevel("CET4")}>
              进入四级课程
            </button>
            <button type="button" className="landing-link" onClick={() => onStartLevel("CET6")}>
              从六级开始
            </button>
            <button type="button" className="landing-link" onClick={() => onOpenLexicon("CET4")}>
              只想查词
            </button>
          </div>

          <div className="closing__foot">
            <p className="closing__credits">
              图片与影像：
              {CREDITS.map((credit, index) => (
                <span key={credit.title}>
                  {index > 0 && "；"}
                  <a href={credit.href} target="_blank" rel="noopener noreferrer">{credit.title}</a>
                  ，{credit.creator}，
                  {credit.liHref
                    ? <a href={credit.liHref} target="_blank" rel="noopener noreferrer">{credit.licence}</a>
                    : credit.licence}
                </span>
              ))}
              。词汇数据来自{" "}
              <a href={LEXICON_SOURCE.url} target="_blank" rel="noopener noreferrer">{LEXICON_SOURCE.name}</a>
              （{LEXICON_SOURCE.license}）。练习内容为原创演示，不是官方真题。
            </p>
            <span className="closing__mark">CET Typing · 轻一点，记得更牢。</span>
          </div>
        </div>
      </section>
    </main>
  );
}
