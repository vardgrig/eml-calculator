import Complex from 'complex.js';
import { describe, expect, it } from 'vitest';
import { calculate, combine } from './calculator';
import { parse } from './engine';

const pastedExample =
  'eml(eml(eml(1, eml(eml(1, eml(1, eml(eml(1, x), 1))), 1)), eml(eml(eml(1, eml(eml(1, eml(eml(1, eml(eml(1, 1), 1)), eml(1, 1))), 1)), eml(eml(1, eml(eml(1, x), 1)), 1)), 1)), 1)';

describe('pasted formulas and captured stack values', () => {
  it('preserves extended-real intermediates in original two-button programs', () => {
    const one = calculate(parse('1'), {});
    const zero = calculate(parse('0'), {});
    const infinity = combine('eml', [one, zero]);
    const doubleInfinity = combine('eml', [infinity, one]);
    const minusInfinity = combine('eml', [one, doubleInfinity]);
    const e = combine('eml', [one, one]);
    expect(infinity.value.re).toBe(Infinity);
    expect(minusInfinity.value.re).toBe(-Infinity);
    expect(combine('eml', [minusInfinity, e]).value.re).toBeCloseTo(-1, 12);
  });
  it('runs the exact pasted EML example at different values of x', () => {
    for (const x of [2, 3, 4])
      expect(
        calculate(parse(pastedExample, new Set()), { x: new Complex(x) }).value.re,
      ).toBeCloseTo(x * x, 10);
  });
  it('combines independently calculated results without re-evaluating old inputs', () => {
    const first = calculate(parse(pastedExample), { x: new Complex(3) });
    const second = calculate(parse(pastedExample), { x: new Complex(4) });
    expect(combine('add', [first, second]).value.re).toBeCloseTo(25, 10);
    expect(first.value.re).toBeCloseTo(9, 10);
    expect(combine('add', [first, second]).inputs).toEqual(['x = 3', 'x = 4']);
  });
  it('accepts both inputs and complex numbers', () => {
    const result = calculate(parse('eml(x,y)'), { x: new Complex(0), y: new Complex(-1) });
    expect(result.value.re).toBeCloseTo(1, 12);
    expect(result.value.im).toBeCloseTo(Math.PI, 12);
    expect(result.inputs).toEqual(['x = 0', 'y = -1']);
  });
  it('continues with primitive, unary and binary operations on results', () => {
    const first = calculate(parse('1'), {});
    expect(combine('eml', [first, first]).value.re).toBeCloseTo(Math.E, 12);
    expect(combine('neg', [first]).value.re).toBe(-1);
    expect(combine('e', []).value.re).toBeCloseTo(Math.E, 12);
    expect(combine('sub', [first, combine('e', [])]).value.re).toBeCloseTo(1 - Math.E, 12);
  });
  it('rejects invalid formulas, missing inputs and undefined results', () => {
    expect(() => calculate(parse('eml(x,1)'), {})).toThrow('value for x');
    expect(() => calculate(parse('eml(1)'), {})).toThrow();
    expect(() => calculate(parse('eml(1,0)'), {})).toThrow('numeric range');
    expect(() => combine('div', [calculate(parse('1'), {}), calculate(parse('0'), {})])).toThrow(
      'zero',
    );
  });
});
