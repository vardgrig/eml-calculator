import Complex from 'complex.js';

export type Expr = { name: string; args: Expr[] };
export const node = (name: string, ...args: Expr[]): Expr => ({ name, args });
export const one = node('1');
const E = (a: Expr, b: Expr) => node('eml', a, b);
const call = (name: string, ...args: Expr[]) => node(name, ...args);
const x = node('x'),
  y = node('y');
export interface Definition {
  id: string;
  label: string;
  title: string;
  arity: number;
  group: string;
  deps: string[];
  recipe: string;
  hint: string;
  explanation: string;
  build: (...args: Expr[]) => Expr;
  run: (...args: Complex[]) => Complex;
}
const z = (n: number) => new Complex(n, 0);
const principalLog = (a: Complex) =>
  a.re < 0 && a.im === 0 ? new Complex(Math.log(-a.re), Math.PI) : a.log();
const cleanZero = (a: Complex) => new Complex(a.re === 0 ? 0 : a.re, a.im === 0 ? 0 : a.im);
const lowerLog = (a: Complex) => {
  if (a.re < 0 && a.im === 0) return new Complex(Math.log(-a.re), -Math.PI);
  return a.log();
};
const defs: Definition[] = [];
function define(d: Definition) {
  defs.push(d);
}
define({
  id: 'exp',
  label: 'eˣ',
  title: 'The exponential',
  arity: 1,
  group: 'Foundations',
  deps: [],
  recipe: 'eml(x, 1)',
  hint: 'What is ln(1)? Remove the logarithm half of EML.',
  explanation: 'Because ln(1) = 0, EML(x, 1) leaves exp(x).',
  build: (a) => E(a, one),
  run: (a) => a.exp(),
});
define({
  id: 'ln',
  label: 'ln',
  title: 'The natural logarithm',
  arity: 1,
  group: 'Foundations',
  deps: ['exp'],
  recipe: 'eml(1, exp(eml(1, x)))',
  hint: 'EML(1, x) is e − ln(x). Exponentiate it, then subtract its logarithm from e.',
  explanation:
    'For positive x: e − ln(exp(e − ln(x))) = ln(x). For negative real x our EML log uses the lower edge of the branch cut, so the derived ln uses the principal upper edge.',
  build: (a) => E(one, E(E(one, a), one)),
  run: principalLog,
});
define({
  id: 'sub',
  label: '−',
  title: 'Subtraction',
  arity: 2,
  group: 'Foundations',
  deps: ['ln'],
  recipe: 'eml(ln(x), exp(y))',
  hint: 'Feed ln(x) into the exponential side and exp(y) into the logarithm side.',
  explanation:
    'For real inputs, exp(ln(x)) − ln(exp(y)) = x − y. At x = 0 we use the extended-real limit exp(−∞) = 0.',
  build: (a, b) => E(call('ln', a), call('exp', b)),
  run: (a, b) => a.sub(b),
});
define({
  id: 'e',
  label: 'e',
  title: 'Meet Euler’s number',
  arity: 0,
  group: 'Numbers',
  deps: ['sub'],
  recipe: 'eml(1, 1)',
  hint: 'The exponential of 1 has a name.',
  explanation: 'EML(1, 1) = e − 0 = e.',
  build: () => E(one, one),
  run: () => z(Math.E),
});
define({
  id: '0',
  label: '0',
  title: 'Something from nothing',
  arity: 0,
  group: 'Numbers',
  deps: ['sub'],
  recipe: 'sub(1, 1)',
  hint: 'A number minus itself.',
  explanation: '1 − 1 = 0. You can now use zero as a building block.',
  build: () => call('sub', one, one),
  run: () => z(0),
});
define({
  id: 'neg',
  label: '±',
  title: 'Flip the sign',
  arity: 1,
  group: 'Arithmetic',
  deps: ['0'],
  recipe: 'sub(0, x)',
  hint: 'What do you get when you subtract x from zero?',
  explanation: 'Negation is simply 0 − x.',
  build: (a) => call('sub', call('0'), a),
  run: (a) => a.neg(),
});
define({
  id: 'add',
  label: '+',
  title: 'The other side of subtraction',
  arity: 2,
  group: 'Arithmetic',
  deps: ['neg'],
  recipe: 'sub(x, neg(y))',
  hint: 'Subtract a negative.',
  explanation: 'x + y = x − (−y).',
  build: (a, b) => call('sub', a, call('neg', b)),
  run: (a, b) => a.add(b),
});
for (let n = 2; n <= 9; n++) {
  const left = Math.floor(n / 2),
    right = n - left;
  const digit = (i: number) => (i === 1 ? one : call(String(i)));
  define({
    id: String(n),
    label: String(n),
    title: `Build the number ${n}`,
    arity: 0,
    group: 'Numbers',
    deps: n === 2 ? ['add'] : [String(n - 1)],
    recipe: `add(${left}, ${right})`,
    hint: `Combine smaller numbers to make ${n}.`,
    explanation: `${left} + ${right} = ${n}. A digit key pushes a new value; it does not concatenate digits.`,
    build: () => call('add', digit(left), digit(right)),
    run: () => z(n),
  });
}
define({
  id: 'mul',
  label: '×',
  title: 'Multiply through logarithms',
  arity: 2,
  group: 'Arithmetic',
  deps: ['add', '2'],
  recipe: 'exp(add(ln(x), ln(y)))',
  hint: 'ln(xy) = ln(x) + ln(y). Undo the logarithm.',
  explanation:
    'Exponentiate the sum of the logarithms. Complex logarithms let negative inputs work too; zero uses the continuous arithmetic extension.',
  build: (a, b) => call('exp', call('add', call('ln', a), call('ln', b))),
  run: (a, b) => a.mul(b),
});
define({
  id: 'div',
  label: '÷',
  title: 'Divide and discover',
  arity: 2,
  group: 'Arithmetic',
  deps: ['mul'],
  recipe: 'exp(sub(ln(x), ln(y)))',
  hint: 'A quotient becomes a difference of logarithms.',
  explanation: 'exp(ln(x) − ln(y)) = x/y. Division by zero is undefined.',
  build: (a, b) => call('exp', call('sub', call('ln', a), call('ln', b))),
  run: (a, b) => {
    if (b.abs() === 0) throw Error('Division by zero is undefined.');
    return a.div(b);
  },
});
define({
  id: 'pow',
  label: 'xʸ',
  title: 'A little more power',
  arity: 2,
  group: 'Arithmetic',
  deps: ['div'],
  recipe: 'exp(mul(y, ln(x)))',
  hint: 'xʸ = exp(y × ln(x)).',
  explanation:
    'Powers combine multiplication, logarithms, and exponentials. Complex powers use the principal logarithm.',
  build: (a, b) => call('exp', call('mul', b, call('ln', a))),
  run: (a, b) => {
    if (a.abs() === 0 && b.abs() === 0) throw Error('0⁰ is undefined here.');
    if (a.abs() === 0 && (b.im !== 0 || b.re < 0)) throw Error('This power of zero is undefined.');
    return a.pow(b);
  },
});
define({
  id: 'sqrt',
  label: '√',
  title: 'Take the root',
  arity: 1,
  group: 'Scientific',
  deps: ['pow'],
  recipe: 'pow(x, div(1, 2))',
  hint: 'A square root is a power of one half.',
  explanation: '√x = x^(1/2). Negative inputs produce the principal complex square root.',
  build: (a) => call('pow', a, call('div', one, call('2'))),
  run: (a) => a.sqrt(),
});
define({
  id: 'i',
  label: 'i',
  title: 'An imaginary discovery',
  arity: 0,
  group: 'Constants',
  deps: ['sqrt', 'neg'],
  recipe: 'sqrt(neg(1))',
  hint: 'Which number squares to −1?',
  explanation:
    'The principal square root of −1 is i. Complex intermediate values are essential to the next discoveries.',
  build: () => call('sqrt', call('neg', one)),
  run: () => new Complex(0, 1),
});
define({
  id: 'pi',
  label: 'π',
  title: 'The long way to pi',
  arity: 0,
  group: 'Constants',
  deps: ['i'],
  recipe: 'div(ln(neg(1)), i)',
  hint: 'On the principal branch, ln(−1) = iπ. Divide by i.',
  explanation:
    'Euler’s identity connects the logarithm of −1 to π. No decimal approximation of π is used in the EML recipe.',
  build: () => call('div', call('ln', call('neg', one)), call('i')),
  run: () => z(Math.PI),
});
define({
  id: 'inv',
  label: '1/x',
  title: 'Turn it upside down',
  arity: 1,
  group: 'Scientific',
  deps: ['div'],
  recipe: 'div(1, x)',
  hint: 'The reciprocal is 1 divided by x.',
  explanation: 'The reciprocal undoes multiplication. It is undefined at zero.',
  build: (a) => call('div', one, a),
  run: (a) => {
    if (a.abs() === 0) throw Error('The reciprocal of zero is undefined.');
    return a.inverse();
  },
});
define({
  id: 'square',
  label: 'x²',
  title: 'Square one',
  arity: 1,
  group: 'Scientific',
  deps: ['mul'],
  recipe: 'mul(x, x)',
  hint: 'Use the same input twice.',
  explanation: 'Squaring is multiplication by yourself.',
  build: (a) => call('mul', a, a),
  run: (a) => a.mul(a),
});
define({
  id: 'log10',
  label: 'log₁₀',
  title: 'Change the base',
  arity: 1,
  group: 'Scientific',
  deps: ['div', '9'],
  recipe: 'div(ln(x), ln(add(9, 1)))',
  hint: 'log₁₀(x) = ln(x)/ln(10). Build 10 from available digits.',
  explanation: 'The change-of-base identity builds a base-10 logarithm.',
  build: (a) => call('div', call('ln', a), call('ln', call('add', call('9'), one))),
  run: (a) => a.log().div(Math.LN10),
});
define({
  id: 'sin',
  label: 'sin',
  title: 'A wave from exponentials',
  arity: 1,
  group: 'Trigonometry',
  deps: ['pi'],
  recipe: 'div(sub(exp(mul(i, x)), exp(neg(mul(i, x)))), mul(2, i))',
  hint: 'Euler: sin(x) = (exp(ix) − exp(−ix))/(2i).',
  explanation: 'Sine comes from two complex exponentials. Angles are in radians.',
  build: (a) => {
    const ix = call('mul', call('i'), a);
    return call(
      'div',
      call('sub', call('exp', ix), call('exp', call('neg', ix))),
      call('mul', call('2'), call('i')),
    );
  },
  run: (a) => a.sin(),
});
define({
  id: 'cos',
  label: 'cos',
  title: 'The other wave',
  arity: 1,
  group: 'Trigonometry',
  deps: ['sin'],
  recipe: 'div(add(exp(mul(i, x)), exp(neg(mul(i, x)))), 2)',
  hint: 'Change the difference in Euler’s sine formula into a sum.',
  explanation: 'cos(x) = (exp(ix) + exp(−ix))/2. Angles are in radians.',
  build: (a) => {
    const ix = call('mul', call('i'), a);
    return call('div', call('add', call('exp', ix), call('exp', call('neg', ix))), call('2'));
  },
  run: (a) => a.cos(),
});
define({
  id: 'tan',
  label: 'tan',
  title: 'Make a tangent',
  arity: 1,
  group: 'Trigonometry',
  deps: ['cos'],
  recipe: 'div(sin(x), cos(x))',
  hint: 'Divide the two waves.',
  explanation: 'tan(x) = sin(x)/cos(x), away from its poles.',
  build: (a) => call('div', call('sin', a), call('cos', a)),
  run: (a) => {
    if (a.cos().abs() < 1e-14) throw Error('Tangent is undefined at this angle.');
    return a.tan();
  },
});
define({
  id: 'sinh',
  label: 'sinh',
  title: 'A hyperbolic detour',
  arity: 1,
  group: 'Scientific',
  deps: ['div', 'neg'],
  recipe: 'div(sub(exp(x), exp(neg(x))), 2)',
  hint: 'Sine’s hyperbolic cousin uses real exponentials.',
  explanation: 'sinh(x) = (exp(x) − exp(−x))/2.',
  build: (a) => call('div', call('sub', call('exp', a), call('exp', call('neg', a))), call('2')),
  run: (a) => a.sinh(),
});
define({
  id: 'cosh',
  label: 'cosh',
  title: 'Hyperbolic cosine',
  arity: 1,
  group: 'Scientific',
  deps: ['sinh'],
  recipe: 'div(add(exp(x), exp(neg(x))), 2)',
  hint: 'Use the sum of the two exponentials.',
  explanation: 'cosh(x) = (exp(x) + exp(−x))/2.',
  build: (a) => call('div', call('add', call('exp', a), call('exp', call('neg', a))), call('2')),
  run: (a) => a.cosh(),
});
define({
  id: 'tanh',
  label: 'tanh',
  title: 'A hyperbolic ratio',
  arity: 1,
  group: 'Scientific',
  deps: ['cosh'],
  recipe: 'div(sinh(x), cosh(x))',
  hint: 'Hyperbolic sine divided by hyperbolic cosine.',
  explanation: 'tanh(x) = sinh(x)/cosh(x).',
  build: (a) => call('div', call('sinh', a), call('cosh', a)),
  run: (a) => a.tanh(),
});
define({
  id: 'asin',
  label: 'sin⁻¹',
  title: 'Reverse the wave',
  arity: 1,
  group: 'Trigonometry',
  deps: ['sin', 'sqrt'],
  recipe: 'neg(mul(i, ln(add(mul(i, x), sqrt(sub(1, mul(x, x)))))))',
  hint: 'asin(x) = −i ln(ix + √(1 − x²)).',
  explanation:
    'The principal inverse sine, in radians. Challenges use real inputs between −1 and 1.',
  build: (a) =>
    call(
      'neg',
      call(
        'mul',
        call('i'),
        call(
          'ln',
          call('add', call('mul', call('i'), a), call('sqrt', call('sub', one, call('mul', a, a)))),
        ),
      ),
    ),
  run: (a) => a.asin(),
});
define({
  id: 'acos',
  label: 'cos⁻¹',
  title: 'Reverse the other wave',
  arity: 1,
  group: 'Trigonometry',
  deps: ['asin'],
  recipe: 'sub(div(pi, 2), asin(x))',
  hint: 'acos(x) + asin(x) = π/2.',
  explanation: 'The principal inverse cosine, in radians.',
  build: (a) => call('sub', call('div', call('pi'), call('2')), call('asin', a)),
  run: (a) => a.acos(),
});
define({
  id: 'atan',
  label: 'tan⁻¹',
  title: 'The final angle',
  arity: 1,
  group: 'Trigonometry',
  deps: ['acos', 'tan'],
  recipe: 'div(sub(ln(add(1, mul(i, x))), ln(sub(1, mul(i, x)))), mul(2, i))',
  hint: 'atan(x) = [ln(1+ix) − ln(1−ix)]/(2i).',
  explanation: 'The principal inverse tangent, in radians.',
  build: (a) => {
    const ix = call('mul', call('i'), a);
    return call(
      'div',
      call('sub', call('ln', call('add', one, ix)), call('ln', call('sub', one, ix))),
      call('mul', call('2'), call('i')),
    );
  },
  run: (a) => a.atan(),
});
export const definitions = defs;
export const byId = Object.fromEntries(defs.map((d) => [d.id, d])) as Record<string, Definition>;
export const sampleTree = (d: Definition) =>
  d.build(...(d.arity === 2 ? [x, y] : d.arity === 1 ? [x] : []));

/** A bounded, non-eval parser. Only 1, EML, inputs and previously earned macros are accepted. */
export function parse(source: string, allowed?: Set<string>): Expr {
  if (source.length > 16000) throw Error('Keep your formula under 16,000 characters.');
  const tokens = source.match(/eml|[A-Za-z_][A-Za-z_0-9]*|\d+|[(),]|\S/g) ?? [];
  let pos = 0,
    count = 0;
  function read(depth: number): Expr {
    if (depth > 100 || ++count > 4000) throw Error('This formula is too deeply nested.');
    let name = tokens[pos++];
    if (name === 'E' || name === 'EML') name = 'eml';
    if (!name) throw Error('Your formula is incomplete.');
    if (name === '1' || name === 'x' || name === 'y') return node(name);
    const arity = name === 'eml' ? 2 : byId[name]?.arity;
    if (arity === undefined)
      throw Error(`Unknown key “${name}”. Use 1, eml, x, y, and earned keys.`);
    if (allowed && name !== 'eml' && !allowed.has(name))
      throw Error(`“${name}” is still locked. Build it from keys you have already earned.`);
    const args: Expr[] = [];
    if (arity > 0) {
      if (tokens[pos++] !== '(') throw Error(`Use ${name}(${arity === 2 ? 'x, y' : 'x'}).`);
      for (let j = 0; j < arity; j++) {
        if (j && tokens[pos++] !== ',') throw Error('Separate the two inputs with a comma.');
        args.push(read(depth + 1));
      }
      if (tokens[pos++] !== ')') throw Error('A closing parenthesis is missing.');
    }
    return node(name, ...args);
  }
  const result = read(0);
  if (pos !== tokens.length)
    throw Error(`Unexpected “${tokens[pos]}”. Write one complete formula.`);
  return result;
}
export function print(a: Expr): string {
  return a.args.length ? `${a.name}(${a.args.map(print).join(', ')})` : a.name;
}
export function expand(expr: Expr): Expr {
  const cache = new Map<Expr, Expr>();
  let budget = 0;
  function visit(a: Expr): Expr {
    const found = cache.get(a);
    if (found) return found;
    if (++budget > 150000)
      throw Error('The expanded expression is too large. Try a smaller formula.');
    const args = a.args.map(visit);
    const result = byId[a.name] ? visit(byId[a.name].build(...args)) : node(a.name, ...args);
    cache.set(a, result);
    return result;
  }
  return visit(expr);
}
export function expressionStats(a: Expr): { nodes: number; depth: number } {
  const memo = new Map<Expr, { nodes: number; depth: number }>();
  function visit(t: Expr): { nodes: number; depth: number } {
    if (memo.has(t)) return memo.get(t)!;
    const children = t.args.map(visit),
      result = {
        nodes: 1 + children.reduce((s, c) => s + c.nodes, 0),
        depth: 1 + Math.max(0, ...children.map((c) => c.depth)),
      };
    memo.set(t, result);
    return result;
  }
  return visit(a);
}
export function printBounded(a: Expr, limit = 6000): string {
  let out = '',
    truncated = false;
  function visit(t: Expr) {
    if (out.length > limit) {
      truncated = true;
      return;
    }
    out += t.name;
    if (t.args.length) {
      out += '(';
      t.args.forEach((v, i) => {
        if (i) out += ', ';
        visit(v);
      });
      out += ')';
    }
  }
  visit(a);
  return truncated ? out.slice(0, limit) + ' … [preview shortened]' : out;
}
function isOne(a: Expr) {
  return a.name === '1';
}
function same(a: Expr, b: Expr): boolean {
  return (
    a.name === b.name &&
    a.args.length === b.args.length &&
    a.args.every((v, i) => same(v, b.args[i]))
  );
}
function match(pattern: Expr, actual: Expr, bindings: Record<string, Expr>): boolean {
  if (pattern.name === 'x' || pattern.name === 'y') {
    if (bindings[pattern.name]) return same(bindings[pattern.name], actual);
    bindings[pattern.name] = actual;
    return true;
  }
  return (
    pattern.name === actual.name &&
    pattern.args.length === actual.args.length &&
    pattern.args.every((v, i) => match(v, actual.args[i], bindings))
  );
}
const stablePatterns = definitions
  .map((d) => ({ d, pattern: parse(d.recipe) }))
  .sort((a, b) => expressionStats(b.pattern).nodes - expressionStats(a.pattern).nodes);
/** Recognize the three real foundation identities before evaluating their unstable intermediates. */
export function evaluate(a: Expr, variables: { x?: Complex; y?: Complex } = {}): Complex {
  if (a.name === '1') return z(1);
  if (a.name === 'x' || a.name === 'y') {
    const value = variables[a.name];
    if (!value) throw Error(`Provide a value for ${a.name}.`);
    return value;
  }
  // Named identities also stabilize a student's formula, not only the earned key.
  // Match the explicit recipes without evaluating log(0) or enormous exponentials.
  for (const { d, pattern } of stablePatterns) {
    if (d.id === a.name || pattern.name !== a.name) continue;
    const bindings: Record<string, Expr> = {};
    if (!match(pattern, a, bindings)) continue;
    const args =
      d.arity === 0
        ? []
        : d.arity === 1
          ? [evaluate(bindings.x, variables)]
          : [evaluate(bindings.x, variables), evaluate(bindings.y, variables)];
    if (d.id === 'ln' && args[0].im !== 0) continue;
    if (d.id === 'sub' && args[1].im !== 0) continue;
    const value = d.run(...args);
    if (Number.isFinite(value.re) && Number.isFinite(value.im)) return cleanZero(value);
    if (d.id === 'ln' && args[0].abs() === 0) return new Complex(-Infinity, 0);
    throw Error('The result is undefined or exceeds the numeric range.');
  }
  if (a.name === 'eml') {
    const [left, right] = a.args;
    if (
      isOne(left) &&
      right.name === 'eml' &&
      isOne(right.args[1]) &&
      right.args[0].name === 'eml' &&
      isOne(right.args[0].args[0])
    ) {
      const input = evaluate(right.args[0].args[1], variables);
      if (input.im === 0) return input.re === 0 ? new Complex(-Infinity, 0) : principalLog(input);
    }
    // The subtraction identity is valid for real y; ln(exp(y)) wraps for complex y.
    if (left.name === 'ln' && right.name === 'exp') {
      const b = evaluate(right.args[0], variables);
      if (b.im === 0) return evaluate(left.args[0], variables).sub(b);
    }
    const aValue = evaluate(left, variables),
      bValue = evaluate(right, variables);
    if (isOne(right)) return aValue.exp();
    const logarithm = bValue.abs() === 0 ? new Complex(-Infinity, 0) : lowerLog(bValue);
    const result = aValue.exp().sub(logarithm);
    if (Number.isNaN(result.re) || Number.isNaN(result.im))
      throw Error(
        'An intermediate value is undefined or too large. Try an earned shortcut for stable evaluation.',
      );
    return result;
  }
  const def = byId[a.name];
  if (!def) throw Error('Unknown operation.');
  const result = def.run(...a.args.map((arg) => evaluate(arg, variables)));
  if (!Number.isFinite(result.re) || !Number.isFinite(result.im))
    throw Error('The result is undefined or exceeds the numeric range.');
  return cleanZero(result);
}
export function format(a: Complex): string {
  const num = (n: number) => (Math.abs(n) < 1e-12 ? '0' : Number(n.toPrecision(11)).toString());
  const re = Math.abs(a.re) < 1e-12 ? 0 : a.re,
    im = Math.abs(a.im) < 1e-12 ? 0 : a.im;
  if (!im) return num(re);
  const imag = Math.abs(im) === 1 ? 'i' : `${num(Math.abs(im))}i`;
  return re ? `${num(re)} ${im < 0 ? '−' : '+'} ${imag}` : `${im < 0 ? '−' : ''}${imag}`;
}
export function parseValue(value: string): Complex {
  try {
    const result = new Complex(value);
    if (!Number.isFinite(result.re) || !Number.isFinite(result.im)) throw Error();
    return result;
  } catch {
    throw Error('Enter a finite number such as 2, −3, 0.5, or 1+2i.');
  }
}
export function validateChallenge(
  d: Definition,
  expr: Expr,
): { ok: boolean; message: string; count: number } {
  const visit = (t: Expr): boolean => t.name === 'x' || t.name === 'y' || t.args.some(visit);
  if (d.arity === 0 && visit(expr))
    return { ok: false, message: 'A constant must be built without x or y.', count: 0 };
  const inputs =
    d.id === 'ln' || d.id === 'log10'
      ? [0.2, 0.5, 1, 2, 4.2, 8]
      : d.id === 'inv'
        ? [-3.2, -1.5, -0.3, 0.4, 1, 2.3, 4.1]
        : d.id === 'asin' || d.id === 'acos'
          ? [-0.9, -0.4, 0, 0.3, 0.8]
          : [-3.2, -1.5, -0.3, 0, 0.4, 1, 2.3, 4.1];
  const samples =
    d.arity === 0
      ? [[]]
      : d.arity === 1
        ? inputs.map((a) => [z(a)])
        : d.id === 'pow'
          ? [
              [z(0.3), z(1.7)],
              [z(2), z(-2)],
              [z(3), z(0.5)],
              [z(-2), z(3)],
              [z(0), z(2)],
            ]
          : inputs.flatMap((a, i) => [0.7, -1.2, 2.5].map((b) => [z(a), z(b + i * 0.1)]));
  let count = 0;
  for (const sample of samples) {
    try {
      const actual = evaluate(expr, { x: sample[0], y: sample[1] }),
        expected = d.run(...sample);
      if (
        !Number.isFinite(actual.re) ||
        !Number.isFinite(actual.im) ||
        actual.sub(expected).abs() > 2e-7 * (1 + expected.abs())
      )
        return {
          ok: false,
          message: `Not quite${sample.length ? ` at x = ${format(sample[0])}${sample[1] ? `, y = ${format(sample[1])}` : ''}` : ''}. Your formula gives ${format(actual)}; expected ${format(expected)}.`,
          count,
        };
      count++;
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'That formula could not be evaluated.',
        count,
      };
    }
  }
  return {
    ok: true,
    message: `Verified on ${count} ${count === 1 ? 'value' : 'inputs'}. ${d.label} is now yours.`,
    count,
  };
}
