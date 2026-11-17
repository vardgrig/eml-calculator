import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FlaskConical,
  Github,
  Lightbulb,
  LockKeyhole,
  RotateCcw,
  Sparkles,
  Undo2,
  X,
} from 'lucide-react';
import {
  byId,
  definitions,
  evaluate,
  expand,
  expressionStats,
  format,
  node,
  one,
  parse,
  parseValue,
  print,
  printBounded,
  sampleTree,
  validateChallenge,
  type Definition,
  type Expr,
} from './engine';
import { decodeProgress, freshProgress, STORAGE_KEY, type Progress } from './progress';

type StackEntry = { expr: Expr; label?: string };
type Notice = { text: string; kind: 'error' | 'success' | 'info' };
const video = 'https://www.youtube.com/watch?v=LxVW3b8jVdE';
const repo = 'https://github.com/vardgrig/eml-calculator';
const groups = [
  'All discoveries',
  'Numbers',
  'Arithmetic',
  'Scientific',
  'Constants',
  'Trigonometry',
];
const recipePreviews = new Map<string, string>();
const lessonCopy: Record<string, { eyebrow: string; intro: string; steps: string[] }> = {
  exp: {
    eyebrow: '01 / THE FIRST BUILDING BLOCK',
    intro: 'EML does two things at once. What if we could silence one of them?',
    steps: [
      'Start with EML(x, y) = exp(x) − ln(y).',
      'Set y to 1. The natural logarithm of 1 is zero.',
      'You are left with exp(x). One function, recovered.',
    ],
  },
  ln: {
    eyebrow: '02 / UNDO THE EXPONENTIAL',
    intro: 'A little nesting brings the natural logarithm back into the picture.',
    steps: [
      'EML(1, x) gives e − ln(x).',
      'Exponentiate that result with your new exp key.',
      'Put it into the second input of EML(1, …). The two copies of e cancel.',
    ],
  },
  sub: {
    eyebrow: '03 / BRING IT TOGETHER',
    intro: 'Now make the exponential and logarithm cancel their own inputs.',
    steps: [
      'Put ln(x) on the exponential side.',
      'Put exp(y) on the logarithm side.',
      'For real inputs, the inverse pairs cancel and leave x − y.',
    ],
  },
};

export default function App() {
  const [progress, setProgress] = useState<Progress>(() => {
    try {
      return decodeProgress(localStorage.getItem(STORAGE_KEY));
    } catch {
      return freshProgress();
    }
  });
  const [storageOK, setStorageOK] = useState(true);
  const [active, setActive] = useState(
    () =>
      definitions.find(
        (d) =>
          !progress.unlocked.includes(d.id) && d.deps.every((id) => progress.unlocked.includes(id)),
      )?.id ?? 'pi',
  );
  const [formula, setFormula] = useState('');
  const [hint, setHint] = useState(false);
  const [solution, setSolution] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [stack, setStack] = useState<StackEntry[]>([]);
  const [history, setHistory] = useState<StackEntry[][]>([]);
  const [calcNotice, setCalcNotice] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState('All discoveries');
  const [modal, setModal] = useState<'guide' | 'credits' | 'reset' | null>(null);
  const [inspect, setInspect] = useState<Expr | null>(null);
  const [xValue, setXValue] = useState('2');
  const [yValue, setYValue] = useState('3');
  const [entry, setEntry] = useState('');
  const [copied, setCopied] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);
  const formulaRef = useRef<HTMLTextAreaElement>(null);
  const d = byId[active];
  const earned = new Set(progress.unlocked);
  const complete = earned.has(active);
  const ready = d.deps.every((id) => earned.has(id));
  const foundations = definitions.filter((v) => v.group === 'Foundations');
  const foundationCount = foundations.filter((v) => earned.has(v.id)).length;
  const total = definitions.length;
  const top = stack.at(-1);
  const vars = () => ({ x: parseValue(xValue), y: parseValue(yValue) });
  const valueOf = (expr: Expr) => {
    try {
      return format(evaluate(expr, vars()));
    } catch {
      return '—';
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      setStorageOK(true);
    } catch {
      setStorageOK(false);
    }
  }, [progress]);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setProgress(decodeProgress(e.newValue));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => {
    if (modal || inspect) modalRef.current?.showModal();
    else modalRef.current?.close();
  }, [modal, inspect]);
  useEffect(() => {
    setFormula(progress.solutions[active] ?? '');
    setHint(false);
    setSolution(false);
    setNotice(null);
  }, [active]);

  function select(id: string) {
    setActive(id);
    document.getElementById('lab')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function mutate(next: StackEntry[]) {
    setHistory((h) => [...h.slice(-39), stack]);
    setStack(next);
    setCalcNotice('');
  }
  function push(expr: Expr, label?: string) {
    if (stack.length >= 100) {
      setCalcNotice('The stack is full. Clear or combine some values.');
      return;
    }
    const size = expressionStats(expr);
    if (size.nodes > 4000 || size.depth > 100) {
      setCalcNotice('This expression is too large. Start a fresh calculation.');
      return;
    }
    mutate([...stack, { expr, label }]);
  }
  function operate(id: string) {
    const arity = id === 'eml' ? 2 : byId[id].arity;
    if (stack.length < arity) {
      setCalcNotice(
        `${id === 'eml' ? 'EML' : byId[id].label} needs ${arity} ${arity === 1 ? 'value' : 'values'} on the stack. Press 1 to add a value.`,
      );
      return;
    }
    const args = arity ? stack.slice(-arity).map((v) => v.expr) : [];
    const expr = node(id, ...args);
    const size = expressionStats(expr);
    if (size.nodes > 4000 || size.depth > 100) {
      setCalcNotice('This expression is too large. Start a fresh calculation.');
      return;
    }
    try {
      evaluate(expr, vars());
      mutate([...stack.slice(0, stack.length - arity), { expr }]);
    } catch (err) {
      setCalcNotice((err as Error).message);
    }
  }
  function verify() {
    if (!ready) {
      setNotice({ kind: 'error', text: 'Finish the prerequisite discoveries first.' });
      return;
    }
    try {
      const expr = parse(formula, earned);
      const result = validateChallenge(d, expr);
      setNotice({ kind: result.ok ? 'success' : 'error', text: result.message });
      if (result.ok) {
        setProgress((p) => ({
          ...p,
          unlocked: [...new Set([...p.unlocked, d.id])],
          solutions: { ...p.solutions, [d.id]: formula },
        }));
      }
    } catch (err) {
      setNotice({ kind: 'error', text: (err as Error).message });
    }
  }
  function next() {
    const target = definitions.find(
      (v) => !earned.has(v.id) && v.deps.every((dep) => earned.has(dep)),
    );
    if (target) select(target.id);
    else document.getElementById('discoveries')?.scrollIntoView({ behavior: 'smooth' });
  }
  function useStack() {
    if (!top) return;
    setFormula(print(top.expr));
    setNotice({
      kind: 'info',
      text: 'Stack expression copied into your answer. Verify it to test the discovery.',
    });
  }
  function downloadProgress() {
    const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eml-lab-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  function importProgress(file?: File) {
    if (!file) return;
    if (file.size > 1000000) {
      setCalcNotice('That progress file is too large.');
      return;
    }
    file
      .text()
      .then((text) => {
        const raw = JSON.parse(text);
        if (raw.version !== 1 || !Array.isArray(raw.unlocked)) throw Error();
        setProgress(decodeProgress(text));
        setCalcNotice('Progress restored from your file.');
      })
      .catch(() => setCalcNotice('That is not a valid EML Lab progress file.'));
  }
  function enterValue() {
    try {
      if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(entry.trim()))
        throw Error('Enter a decimal number, such as 12.5 or −3.');
      if (entry.length > 24) throw Error('Keep number entries to 24 characters or fewer.');
      const v = Number(entry);
      if (!Number.isFinite(v) || Math.abs(v) > 1e9)
        throw Error('Use a finite number between −1 billion and 1 billion.');
      const digits = entry.replace(/[^0-9]/g, '').split('');
      const missing = digits.find((c) => c !== '1' && !earned.has(c));
      if (missing) throw Error(`Unlock the ${missing} key before entering this number.`);
      if (v < 0 && !earned.has('neg')) throw Error('Unlock negation first.');
      if (entry.includes('.') && !earned.has('div'))
        throw Error('Unlock division to enter decimals.');
      if (digits.length > 1 && !earned.has('mul'))
        throw Error('Unlock multiplication to enter multi-digit numbers.');
      const makeDigit = (c: string) => (c === '1' ? one : node(c));
      const ten = Array.from({ length: 9 }).reduce<Expr>((a) => node('add', a, one), one);
      const buildInteger = (s: string): Expr =>
        s
          .split('')
          .reduce<Expr | null>(
            (a, c) => (a ? node('add', node('mul', a, ten), makeDigit(c)) : makeDigit(c)),
            null,
          )!;
      const normalized = entry.trim().replace(/^-/, ''),
        [whole, fraction] = normalized.split('.');
      let expr = buildInteger(whole || '0');
      if (fraction?.length) {
        const denominator = '1' + '0'.repeat(fraction.length);
        expr = node('div', buildInteger((whole || '0') + fraction), buildInteger(denominator));
      }
      if (v < 0) expr = node('neg', expr);
      push(expr, entry);
      setEntry('');
    } catch (err) {
      setCalcNotice((err as Error).message);
    }
  }
  const recipePreview = (def: Definition) => {
    if (!recipePreviews.has(def.id))
      recipePreviews.set(def.id, printBounded(expand(sampleTree(def)), 82));
    return recipePreviews.get(def.id)!;
  };
  let expandedInspection: Expr | null = null;
  let inspectionError = '';
  if (inspect) {
    try {
      expandedInspection = expand(inspect);
    } catch (err) {
      inspectionError = (err as Error).message;
    }
  }
  const stats = expandedInspection ? expressionStats(expandedInspection) : null;

  return (
    <>
      <header className="site-header">
        <a href="#" className="brand" aria-label="EML Lab home">
          <span className="brand-mark">
            e<span>1</span>
          </span>
          EML<span className="brand-light">lab</span>
          <span className="beta">AN EXPERIMENT IN MATH</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#lab">The lab</a>
          <a href="#discoveries">Discoveries</a>
          <button onClick={() => setModal('guide')}>
            Field guide <BookOpen size={14} />
          </button>
        </nav>
        <a href={repo} target="_blank" rel="noreferrer" className="github-link">
          <Github size={18} />
          <span>Source code</span>
          <ArrowUpRight size={14} />
        </a>
      </header>
      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">
              <span className="live-dot" /> SMALL TOOLKIT. INFINITE POSSIBILITIES.
            </p>
            <h1>
              Two buttons.
              <br />A whole world of <span>math.</span>
            </h1>
            <p className="hero-description">
              Start with <b>1</b> and <b>EML</b>. Discover how to build everything else.
              <br className="desktop-break" /> Every function you figure out becomes a key you get
              to keep.
            </p>
            <a className="hero-cta" href="#lab">
              {progress.unlocked.length ? 'Back to the experiment' : 'Let’s build a calculator'}{' '}
              <ArrowDown size={16} />
            </a>
            <span className="hero-note">No account. Just curiosity.</span>
          </div>
          <div
            className="hero-diagram"
            aria-label="EML takes x and y and returns exponential x minus natural logarithm y"
          >
            <div className="diagram-label">THE ENTIRE STARTING TOOLKIT</div>
            <div className="diagram-keys">
              <span>1</span>
              <span>
                EML<small>exp − ln</small>
              </span>
            </div>
            <div className="diagram-line" />
            <div className="diagram-equation">
              eml(x, y) = e<sup>x</sup> − ln(y)
            </div>
            <div className="diagram-caption">One constant. One operation. A lot to discover.</div>
            <span className="diagram-spark">✳</span>
          </div>
        </section>

        <div className="lab-heading" id="lab">
          <div>
            <span className="section-number">01 —</span>
            <h2>The workbench</h2>
            <span className="muted desktop-only">A scientific calculator, built by you.</span>
          </div>
          <div className="save-status">
            <span className={storageOK ? 'save-dot' : 'warning-dot'} />
            {storageOK ? 'Progress saved on this device' : 'Progress is temporary'}
            <span className="progress-count">
              {earned.size} / {total}
            </span>
          </div>
        </div>
        {!storageOK && (
          <div className="storage-warning">
            Your browser is blocking local storage. You can keep playing, and export your progress
            from the bottom of the page before leaving.
          </div>
        )}
        <section className="workbench">
          <div className="calculator">
            <div className="calc-top">
              <div>
                <span className="tiny-title">YOUR CALCULATOR</span>
                <span className="calc-model">EML / 001</span>
              </div>
              <button
                role="switch"
                aria-checked={expanded}
                onClick={() => setExpanded(!expanded)}
                className="mode-switch"
              >
                <span className={!expanded ? 'mode-active' : ''}>Two keys</span>
                <span className={expanded ? 'mode-active' : ''}>
                  Earned keys <span className="mode-badge">{earned.size}</span>
                </span>
              </button>
            </div>
            <div className="calc-display">
              <div className="display-top">
                <span>{top ? 'RESULT' : 'READY WHEN YOU ARE'}</span>
                <span>
                  RAD <span className="display-dot">·</span> COMPLEX
                </span>
              </div>
              <div className={'result ' + (!top ? 'empty-result' : '')} aria-live="polite">
                {top ? valueOf(top.expr) : 'Let’s make something.'}
              </div>
              <div className="display-expression">
                {top ? printBounded(top.expr, 130) : 'Press 1 twice, then EML. See what happens.'}
              </div>
              {top && (
                <button
                  className="inspect-result"
                  onClick={() => setInspect(top.expr)}
                  aria-label="Inspect EML expression"
                >
                  <Code2 size={16} />
                </button>
              )}
            </div>
            <div className="stack-header">
              <span>
                THE STACK <span>{stack.length.toString().padStart(2, '0')}</span>
              </span>
              <div>
                <button
                  title="Undo last action"
                  disabled={!history.length}
                  onClick={() => {
                    setStack(history.at(-1)!);
                    setHistory(history.slice(0, -1));
                    setCalcNotice('');
                  }}
                >
                  <Undo2 size={14} /> Undo
                </button>
                <button disabled={!stack.length} onClick={() => mutate([])}>
                  Clear <X size={13} />
                </button>
              </div>
            </div>
            <div className="stack-items" aria-label="Calculator stack">
              {!stack.length ? (
                <span className="stack-placeholder">
                  Your values will line up here <ArrowRight size={14} />
                </span>
              ) : (
                stack.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setInspect(item.expr)}
                    title={printBounded(item.expr, 150)}
                    className={i === stack.length - 1 ? 'stack-chip top-chip' : 'stack-chip'}
                  >
                    <small>{i + 1}</small>
                    {valueOf(item.expr)}
                    {i === stack.length - 1 && <span>TOP</span>}
                  </button>
                ))
              )}
            </div>
            <div className="primary-keys">
              <button className="one-key" onClick={() => push(one)}>
                <span>1</span>
                <small>ADD ONE TO THE STACK</small>
              </button>
              <button className="eml-key" onClick={() => operate('eml')}>
                <span>
                  EML <ArrowUpRight size={21} />
                </span>
                <small>
                  e<sup>x</sup> − ln(y)
                </small>
              </button>
            </div>
            {expanded && (
              <div className="earned-keypad">
                <div className="keypad-heading">
                  <Sparkles size={13} /> YOUR EARNED SHORTCUTS <span>{earned.size}</span>
                </div>
                {!earned.size ? (
                  <p className="muted">
                    Finish your first guided discovery to grow your calculator.
                  </p>
                ) : (
                  <>
                    <div className="earned-keys">
                      {definitions
                        .filter((v) => earned.has(v.id))
                        .map((v) => (
                          <div className="earned-key" key={v.id}>
                            <button
                              className="shortcut-key"
                              onClick={() => operate(v.id)}
                              title={`${v.title}: ${v.recipe}`}
                              aria-label={`Use ${v.label}`}
                            >
                              <b>{v.label}</b>
                              <code>{recipePreview(v)}</code>
                            </button>
                            <button
                              className="key-inspect"
                              aria-label={`Inspect ${v.label} recipe`}
                              onClick={() => setInspect(sampleTree(v))}
                            >
                              <Code2 size={12} />
                            </button>
                          </div>
                        ))}
                    </div>
                    <form
                      className="numeric-entry"
                      onSubmit={(e) => {
                        e.preventDefault();
                        enterValue();
                      }}
                    >
                      <input
                        aria-label="Number to push"
                        value={entry}
                        onChange={(e) => setEntry(e.target.value)}
                        placeholder="Enter a number using earned digits"
                        inputMode="decimal"
                      />
                      <button>
                        Add to stack <ArrowRight size={14} />
                      </button>
                    </form>
                    <p className="tiny muted">
                      Digits push separate values. Number entry builds an EML expression from your
                      earned keys.
                    </p>
                  </>
                )}
              </div>
            )}
            {calcNotice && (
              <p role="status" className="calc-notice">
                {calcNotice}
              </p>
            )}
            <div className="calc-bottom">
              <span>
                <span className="small-dot" />{' '}
                {expanded ? 'A GROWING TOOLKIT' : 'THE ORIGINAL TWO-BUTTON EXPERIENCE'}
              </span>
              <button onClick={() => setModal('guide')}>
                How the stack works <ArrowUpRight size={12} />
              </button>
            </div>
          </div>

          <aside className="discovery-panel" aria-label="Current discovery">
            <div className="panel-top">
              <span>
                <FlaskConical size={15} />{' '}
                {d.group === 'Foundations' ? 'THE GUIDED START' : 'DISCOVERY CHALLENGE'}
              </span>
              <span>
                {d.group === 'Foundations' ? (
                  `${foundations.findIndex((v) => v.id === active) + 1} / 3`
                ) : (
                  <>{earned.size} KEYS EARNED</>
                )}
              </span>
            </div>
            <div className="lesson-tabs">
              {foundations.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => select(f.id)}
                  className={`${active === f.id ? 'selected' : ''} ${earned.has(f.id) ? 'done' : ''}`}
                  disabled={!f.deps.every((id) => earned.has(id))}
                >
                  {earned.has(f.id) ? <Check size={13} /> : <span>{i + 1}</span>}
                  {f.label}
                </button>
              ))}
              <span className="lesson-tabs-caption">the foundations</span>
            </div>
            <div className="challenge-content">
              <p className="eyebrow">
                {lessonCopy[active]?.eyebrow ??
                  `${d.group.toUpperCase()} / ${d.arity === 0 ? 'CONSTANT' : d.arity === 1 ? 'ONE INPUT' : 'TWO INPUTS'}`}
              </p>
              <h3>
                {d.title}
                <span className="challenge-symbol">{d.label}</span>
              </h3>
              <p className="challenge-intro">
                {lessonCopy[active]?.intro ??
                  (d.arity === 0
                    ? `Build ${d.label} using only 1, EML, and the keys you’ve earned.`
                    : `Write a formula for ${d.label}${d.arity === 2 ? '(x, y)' : '(x)'}. Use your earned functions as building blocks.`)}
              </p>
              {lessonCopy[active] && (
                <ol className="lesson-steps">
                  {lessonCopy[active].steps.map((s, i) => (
                    <li key={s}>
                      <span>{String(i + 1).padStart(2, '0')}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              )}
              {!ready ? (
                <div className="locked-message">
                  <LockKeyhole size={18} />
                  <p>
                    First discover{' '}
                    {d.deps
                      .filter((id) => !earned.has(id))
                      .map((id) => byId[id].label)
                      .join(', ')}
                    .
                  </p>
                  <button
                    className="text-button"
                    onClick={() => select(d.deps.find((id) => !earned.has(id))!)}
                  >
                    Go to prerequisite <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="answer-label">
                    <label htmlFor="formula">
                      {complete ? 'YOUR DISCOVERED RECIPE' : 'YOUR FORMULA'}
                    </label>
                    <span>
                      {d.arity === 0 ? 'no inputs' : d.arity === 2 ? 'use x and y' : 'use x'}
                    </span>
                  </div>
                  <div className="formula-editor">
                    <textarea
                      id="formula"
                      ref={formulaRef}
                      spellCheck={false}
                      value={formula}
                      onChange={(e) => {
                        setFormula(e.target.value);
                        setNotice(null);
                      }}
                      placeholder={
                        d.group === 'Foundations' ? 'eml(…)' : 'Build your expression here…'
                      }
                      aria-describedby="formula-help"
                    />
                    <div className="editor-tools">
                      <span id="formula-help">
                        1 · eml(a, b){earned.size ? ' · earned functions' : ''}
                      </span>
                      <button
                        onClick={useStack}
                        disabled={!top}
                        title="Copy your calculator's top expression"
                      >
                        Use stack <ArrowUpRight size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="answer-actions">
                    <button
                      className={'verify-button ' + (complete ? 'verified-button' : '')}
                      onClick={verify}
                    >
                      {complete ? (
                        <>
                          <CheckCheck size={16} /> Verify again
                        </>
                      ) : (
                        <>
                          Check my discovery <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                    <button
                      className={'hint-button ' + (hint ? 'hint-active' : '')}
                      onClick={() => setHint(!hint)}
                      aria-expanded={hint}
                    >
                      <Lightbulb size={16} />
                      <span>A little hint</span>
                    </button>
                  </div>
                  {formula && (
                    <button
                      className="try-formula"
                      onClick={() => {
                        try {
                          const expr = parse(formula, earned);
                          evaluate(expr, vars());
                          push(expr);
                          setNotice({
                            kind: 'info',
                            text: `Added to the calculator with x = ${xValue}, y = ${yValue}. Change these input values in the field guide.`,
                          });
                        } catch (err) {
                          setNotice({ kind: 'error', text: (err as Error).message });
                        }
                      }}
                    >
                      Try in calculator <ArrowUpRight size={13} />
                    </button>
                  )}
                  {hint && (
                    <div className="hint-box">
                      <p>{d.hint}</p>
                      <button onClick={() => setSolution(!solution)}>
                        {solution ? 'Hide recipe' : 'Show a worked recipe'}{' '}
                        <ChevronRight size={13} />
                      </button>
                      {solution && (
                        <>
                          <code>{d.recipe}</code>
                          <p className="tiny">{d.explanation}</p>
                          <button
                            className="text-button"
                            onClick={() => {
                              setFormula(d.recipe);
                              formulaRef.current?.focus();
                            }}
                          >
                            Try this recipe <ArrowRight size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {notice && (
                    <div className={`notice ${notice.kind}`} role="status">
                      {notice.kind === 'success' && <Check size={16} />}
                      <span>
                        {notice.text}
                        {notice.kind === 'success' && (
                          <small>
                            Numerical checks support the identity; the field guide explains its
                            scope.
                          </small>
                        )}
                      </span>
                    </div>
                  )}
                  {complete && (
                    <button className="next-discovery" onClick={next}>
                      {earned.size === total
                        ? 'You’ve built the full calculator'
                        : 'On to the next discovery'}{' '}
                      <ArrowRight size={16} />
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="panel-footer">
              <span className="small-dot" />
              {complete
                ? 'This key is in your earned toolkit.'
                : d.group === 'Foundations'
                  ? `${foundationCount} of 3 foundations discovered. Then, the lab is yours.`
                  : 'Solve it. Keep the key. Build something bigger.'}
            </div>
          </aside>
        </section>
        <div className="workbench-note">
          <span>
            <Lightbulb size={15} />
            <b>A quick tip:</b> EML takes the last two values: the earlier one is x, the top one is
            y.
          </span>
          <button
            onClick={() => {
              mutate([{ expr: one }, { expr: one }]);
            }}
          >
            Set up 1, 1 <ArrowRight size={13} />
          </button>
        </div>

        <section className="discoveries-section" id="discoveries">
          <div className="collection-heading">
            <div>
              <p className="eyebrow">02 — YOUR EXPANDING UNIVERSE</p>
              <h2>Every key has a story.</h2>
              <p>Follow the trail, or pick a discovery that sparks your curiosity.</p>
            </div>
            <div className="collection-progress">
              <span>
                <b>{earned.size}</b> / {total}
                <small>DISCOVERIES MADE</small>
              </span>
              <div className="progress-track">
                <span style={{ width: `${(earned.size / total) * 100}%` }} />
              </div>
            </div>
          </div>
          <div className="filter-bar" role="group" aria-label="Filter discoveries">
            {groups.map((g) => (
              <button key={g} onClick={() => setFilter(g)} className={filter === g ? 'active' : ''}>
                {g}
                {g === 'All discoveries' && <span>{total}</span>}
              </button>
            ))}
            <span className="filter-note">
              <span className="available-dot" /> Ready to discover
            </span>
          </div>
          <div className="discovery-grid">
            {definitions
              .filter((v) => filter === 'All discoveries' || v.group === filter)
              .map((v, i) => {
                const done = earned.has(v.id),
                  available = v.deps.every((id) => earned.has(id));
                return (
                  <button
                    key={v.id}
                    onClick={() => select(v.id)}
                    className={`discovery-card ${done ? 'unlocked' : available ? 'available' : 'locked'}`}
                  >
                    <div className="card-top">
                      <span>
                        {String(definitions.indexOf(v) + 1).padStart(2, '0')} / {v.group}
                      </span>
                      {done ? (
                        <Check size={15} />
                      ) : available ? (
                        <span className="available-dot" />
                      ) : (
                        <LockKeyhole size={13} />
                      )}
                    </div>
                    <div className="card-symbol">{v.label}</div>
                    <h3>{v.title}</h3>
                    <div className="card-bottom">
                      <span>
                        {done
                          ? 'In your toolkit'
                          : available
                            ? 'Ready to discover'
                            : `Needs ${v.deps
                                .filter((dep) => !earned.has(dep))
                                .map((dep) => byId[dep].label)
                                .join(', ')}`}
                      </span>
                      <ArrowUpRight size={15} />
                    </div>
                  </button>
                );
              })}
          </div>
        </section>

        <section className="origin-banner">
          <div className="origin-icon">
            <BookOpen size={25} />
          </div>
          <div>
            <p className="eyebrow">GOOD IDEAS ARE WORTH SHARING</p>
            <h2>Inspired by a wonderfully unreasonable calculator.</h2>
            <p>
              An interactive companion to Numberphile’s video with Dr James Grime,
              <br className="desktop-break" /> exploring Andrzej Odrzywołek’s EML operator.
            </p>
          </div>
          <button onClick={() => setModal('credits')}>
            Meet the minds behind it <ArrowUpRight size={16} />
          </button>
        </section>
      </main>
      <footer>
        <div className="footer-brand">
          EML<span>lab</span>
          <small>Built from very little.</small>
        </div>
        <div className="footer-tools">
          <button onClick={downloadProgress}>
            <Download size={13} /> Export progress
          </button>
          <label className="import-progress">
            Restore progress
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                importProgress(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          <button onClick={() => setModal('reset')}>
            <RotateCcw size={12} /> Start over
          </button>
        </div>
        <div className="footer-links">
          <button onClick={() => setModal('credits')}>Credits & sources</button>
          <a href={repo} target="_blank" rel="noreferrer">
            GitHub <ArrowUpRight size={12} />
          </a>
        </div>
      </footer>

      <dialog
        ref={modalRef}
        onCancel={() => {
          setModal(null);
          setInspect(null);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setModal(null);
            setInspect(null);
          }
        }}
      >
        <div className="modal-content">
          <button
            className="modal-close"
            aria-label="Close dialog"
            onClick={() => {
              setModal(null);
              setInspect(null);
            }}
          >
            <X size={20} />
          </button>
          {inspect ? (
            <>
              <p className="eyebrow">UNDER THE HOOD</p>
              <h2>One operation, all the way down.</h2>
              <p className="modal-formula">{printBounded(inspect, 250)}</p>
              {stats && (
                <div className="inspection-stats">
                  <span>
                    <b>{stats.nodes.toLocaleString()}</b> button presses
                  </span>
                  <span>
                    <b>{stats.depth}</b> tree depth
                  </span>
                  <span>
                    <b>1 + EML</b> primitives
                  </span>
                </div>
              )}
              <p>
                Every earned key is a named recipe. Expand it and only 1, EML, and input
                placeholders remain.
              </p>
              {inspectionError ? (
                <p className="notice error">{inspectionError}</p>
              ) : (
                <pre className="expanded-code">
                  {expandedInspection && printBounded(expandedInspection)}
                </pre>
              )}
              <div className="modal-actions">
                <button
                  className="verify-button"
                  onClick={async () => {
                    if (!expandedInspection) return;
                    try {
                      await navigator.clipboard.writeText(
                        printBounded(expandedInspection, 1000000),
                      );
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch {
                      setCalcNotice(
                        'Clipboard unavailable. Select and copy the expression manually.',
                      );
                    }
                  }}
                >
                  <Copy size={15} />
                  {copied ? 'Copied' : 'Copy EML expression'}
                </button>
              </div>
              <p className="tiny muted">
                Earned keys use stable mathematical identities for evaluation. Fully expanded EML
                trees can overflow or encounter branch cuts; the expansion shows the construction,
                not a guarantee of numerical equivalence over all complex inputs.
              </p>
            </>
          ) : modal === 'guide' ? (
            <>
              <p className="eyebrow">THE FIELD GUIDE</p>
              <h2>
                A tiny toolkit.
                <br />A different way to think.
              </h2>
              <h3>What is EML?</h3>
              <p>
                <b>Exponential Minus Log:</b> eml(x, y) = exp(x) − ln(y). An exponential raises e to
                a power; a natural logarithm reverses that operation. Combine them and a single
                binary operation can generate a scientific calculator’s functions with the constant
                1.
              </p>
              <h3>How the two keys work</h3>
              <p>
                This is a stack calculator (Reverse Polish Notation). Press <b>1</b> to push a new
                value. Press <b>EML</b> to replace the last two values with their result. The
                earlier value is x; the top value is y. Try <code>1 → 1 → EML</code> to make e. Undo
                and Clear are editing controls.
              </p>
              <h3>How to earn a key</h3>
              <p>
                Recover exp, ln, and subtraction with the guided lessons. Then solve challenges with{' '}
                <code>1</code>, <code>eml(a, b)</code>, and any earned recipe names (such as{' '}
                <code>sub(x, y)</code>). Function challenges allow placeholders x and y. Other
                literal numbers must be earned. Hints and worked recipes are always available.
              </p>
              <p>
                Switch to <b>Earned keys</b> to use your discoveries. Each key shows its EML
                construction; click its code icon to inspect the expansion. In this mode you can
                enter numbers using earned digits. Radians are used for angles.
              </p>
              <h3>Complex numbers & numerical scope</h3>
              <p>
                π needs complex intermediate values. EML uses a logarithm with argument in [−π, π),
                making the derived ln agree with the principal logarithm for negative real inputs.
                Earned ln, powers, and scientific functions use standard principal complex values.
                General complex nesting can cross branch cuts, so expanded recipes are intended as
                real-input constructions on the indicated domains, with complex intermediates.
              </p>
              <p>
                Earned functions evaluate stable identities rather than blindly running huge EML
                trees. This avoids overflow and handles zero through continuous extensions where
                appropriate. Raw EML still evaluates exp(x) − ln(y); ln(0) uses the extended-real
                limit. Undefined results show an error. Numerical challenge tests are evidence, not
                symbolic proofs.
              </p>
              <h3>Your progress belongs to this browser</h3>
              <p>
                No account, server database, analytics, or tracking cookies. Progress lives in
                localStorage on this device and site address. Clearing browser data removes it.
                Export a backup to move to another browser; restore it here later.
              </p>
              <div className="variable-settings">
                <h3>Playground input values</h3>
                <p>
                  These set x and y for expressions sent from a challenge to the calculator. They do
                  not change the challenge tests.
                </p>
                <label>
                  x<input value={xValue} onChange={(e) => setXValue(e.target.value)} />
                </label>
                <label>
                  y<input value={yValue} onChange={(e) => setYValue(e.target.value)} />
                </label>
              </div>
            </>
          ) : modal === 'credits' ? (
            <>
              <p className="eyebrow">THE IDEAS BEHIND THE EXPERIMENT</p>
              <h2>Built on good mathematics.</h2>
              <a className="source-block" href={video} target="_blank" rel="noreferrer">
                <span className="source-number">01</span>
                <div>
                  <h3>A Two-Button Calculator That Does Everything</h3>
                  <p>
                    Numberphile · Presented by Dr James Grime
                    <br />
                    Video by Brady Haran and Pete McPartlan
                  </p>
                  <span>
                    Watch the original video <ExternalLink size={13} />
                  </span>
                </div>
              </a>
              <a
                className="source-block"
                href="https://arxiv.org/html/2603.21852v2"
                target="_blank"
                rel="noreferrer"
              >
                <span className="source-number">02</span>
                <div>
                  <h3>All elementary functions from a single operator</h3>
                  <p>Andrzej Odrzywołek · arXiv:2603.21852v2</p>
                  <span>
                    Read the mathematical source <ExternalLink size={13} />
                  </span>
                </div>
              </a>
              <p>
                This independent educational project turns the idea into a sequence of interactive
                discoveries. The lesson text, challenge system, design, and implementation are
                original. No video footage, transcript, channel branding, or third-party calculator
                code is reproduced. This project is not affiliated with or endorsed by Numberphile
                or the researchers.
              </p>
              <a
                className="text-button"
                href="https://www.singingbanana.com/"
                target="_blank"
                rel="noreferrer"
              >
                More from Dr James Grime <ArrowUpRight size={14} />
              </a>
            </>
          ) : modal === 'reset' ? (
            <>
              <p className="eyebrow">A FRESH EXPERIMENT</p>
              <h2>Back to two buttons?</h2>
              <p>
                This removes your saved discoveries from this browser. Export your progress first if
                you want to keep a backup.
              </p>
              <div className="modal-actions">
                <button
                  className="verify-button"
                  onClick={() => {
                    setProgress(freshProgress());
                    setActive('exp');
                    setFormula('');
                    setNotice(null);
                    setStack([]);
                    setHistory([]);
                    setExpanded(false);
                    setModal(null);
                  }}
                >
                  Reset my progress
                </button>
                <button className="text-button" onClick={() => setModal(null)}>
                  Keep exploring
                </button>
              </div>
            </>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
