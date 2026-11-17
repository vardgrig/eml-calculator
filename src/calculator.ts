import type Complex from 'complex.js';
import { evaluate, node, type Expr } from './engine';

export interface Calculation {
  expr: Expr;
  value: Complex;
  inputs: string[];
}

/** Capture input values so later edits cannot change numbers already on the stack. */
export function calculate(expr: Expr, variables: { x?: Complex; y?: Complex }): Calculation {
  const used = new Set<string>();
  const visit = (part: Expr) => {
    if (part.name === 'x' || part.name === 'y') used.add(part.name);
    part.args.forEach(visit);
  };
  visit(expr);
  const value = evaluate(expr, variables);
  if (!Number.isFinite(value.re) || !Number.isFinite(value.im))
    throw Error('The result is undefined or exceeds the numeric range.');
  return {
    expr,
    value,
    inputs: [...used].map((name) => `${name} = ${variables[name as 'x' | 'y']!.toString()}`),
  };
}

export function combine(operation: string, operands: Calculation[]): Calculation {
  // Continue with the captured numbers, not formulas evaluated using newer input values.
  const expression = node(operation, ...operands.map((_, i) => node(i === 0 ? 'x' : 'y')));
  const value = evaluate(expression, { x: operands[0]?.value, y: operands[1]?.value });
  // Primitive RPN programs may need ±Infinity as extended-real intermediates.
  // The engine rejects undefined values; pasted final results must be finite in calculate().
  return {
    expr: node(operation, ...operands.map((operand) => operand.expr)),
    value,
    inputs: [...new Set(operands.flatMap((operand) => operand.inputs))],
  };
}
