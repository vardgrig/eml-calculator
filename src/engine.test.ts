import { describe,it,expect } from 'vitest';
import Complex from 'complex.js';
import { byId,definitions,evaluate,expand,expressionStats,node,parse,print,validateChallenge } from './engine';
import { decodeProgress,freshProgress } from './progress';

describe('EML foundations',()=>{
  it('evaluates the two-button sequence 1 1 EML as e',()=>expect(evaluate(parse('eml(1,1)')).re).toBeCloseTo(Math.E,12));
  it('recovers ln for positive and negative real inputs with the declared branch',()=>{
    for(const value of [0.1,1,4,-1,-4]){
      const result=evaluate(parse('eml(1, eml(eml(1, x), 1))'),{x:new Complex(value)});
      const expected=new Complex(value).log();expect(result.sub(expected).abs()).toBeLessThan(1e-10);
    }
  });
  it('subtracts negative inputs and zero without invalid intermediates',()=>{
    const expr=parse(byId.sub.recipe);
    for(const a of [-3,0,1,10])for(const b of [-3,0,2])expect(evaluate(expr,{x:new Complex(a),y:new Complex(b)}).re).toBeCloseTo(a-b,10);
  });
  it('has the stated EML branch at negative real y',()=>expect(evaluate(parse('eml(1,neg(1))')).im).toBeCloseTo(Math.PI,12));
  it('keeps earned principal logs on the upper branch after negation creates signed zero',()=>{
    expect(evaluate(parse('ln(neg(1))')).im).toBeCloseTo(Math.PI,12);
    expect(evaluate(parse('pow(neg(1),div(1,2))')).im).toBeCloseTo(1,12);
    expect(evaluate(parse('sqrt(neg(1))')).im).toBeCloseTo(1,12);
  });
});
describe('discoveries',()=>{
  const earned=new Set<string>();
  for(const def of definitions){
    it(`unlocks ${def.id} with its worked recipe and available dependencies`,()=>{
      expect(def.deps.every(d=>earned.has(d))).toBe(true);
      const expr=parse(def.recipe,earned);
      const result=validateChallenge(def,expr);
      expect(result.message).toBeTruthy();expect(result.ok,result.message).toBe(true);
      earned.add(def.id);
    });
    it(`compiles ${def.id} into only EML, 1, and inputs`,()=>{
      const full=expand(parse(def.recipe));
      const visit=(a:ReturnType<typeof node>)=>{expect(['eml','1','x','y']).toContain(a.name);a.args.forEach(visit);};visit(full);
      expect(expressionStats(full).nodes).toBeGreaterThan(0);
    });
  }
  it('rejects a memorized value for a function',()=>expect(validateChallenge(byId.add,parse('1')).ok).toBe(false));
  it('rejects an input-dependent constant',()=>expect(validateChallenge(byId['2'],parse('sub(x,x)')).ok).toBe(false));
  it('supports pi and trigonometry through recipes with complex intermediates',()=>{
    expect(evaluate(parse(byId.pi.recipe)).re).toBeCloseTo(Math.PI,12);
    expect(evaluate(parse('sin(div(pi,2))')).re).toBeCloseTo(1,12);
    expect(evaluate(parse('sqrt(neg(1))')).im).toBeCloseTo(1,12);
  });
  it('executes foundational pure-EML expansions as actual primitive trees',()=>{
    for(const d of definitions){
      const id=d.id,tree=expand(parse(d.recipe));
      const sample=[new Complex(0.4),new Complex(1.3)];
      const expected=d.run(...sample);
      expect(evaluate(tree,{x:sample[0],y:sample[1]}).sub(expected).abs(),id).toBeLessThan(1e-7);
    }
  });
  it('keeps raw EML complex wrapping distinct from subtraction',()=>{
    const result=evaluate(parse('eml(ln(x),exp(y))'),{x:new Complex(2),y:new Complex(0,7)});
    expect(result.im).not.toBeCloseTo(-7,5);
  });
});
describe('parser and numeric boundaries',()=>{
  it('blocks locked shortcuts and numeric constants',()=>{
    expect(()=>parse('mul(x,y)',new Set(['sub']))).toThrow('locked');
    expect(()=>parse('2',new Set())).toThrow('locked');
    expect(()=>parse('12')).toThrow('Unknown');
    expect(()=>parse('Math.PI')).toThrow();
  });
  it('rejects malformed and excessive expressions without eval',()=>{
    for(const source of ['eml(1)','eml(1,1) extra','alert(1)','eml(1,,1)',''])expect(()=>parse(source)).toThrow();
    expect(()=>parse('eml(1,'.repeat(110)+'1'+')'.repeat(110))).toThrow('nested');
  });
  it('round trips parsed expressions',()=>expect(print(parse('eml(1, exp(eml(1,x)))'))).toBe('eml(1, exp(eml(1, x)))'));
  it('shows undefined operations as errors',()=>{
    for(const source of ['div(1,0)','pow(0,0)','inv(0)','tan(div(pi,2))'])expect(()=>evaluate(parse(source))).toThrow();
  });
});
describe('local progress',()=>{
  it('recovers from malformed, old, or absent storage',()=>{for(const raw of [null,'{','{}','{"version":2}'])expect(decodeProgress(raw)).toEqual(freshProgress());});
  it('restores valid dependencies and discards unknown unlocks',()=>{
    expect(decodeProgress(JSON.stringify({version:1,unlocked:['sub','ln','exp','not-a-key'],solutions:{sub:'eml(ln(x),exp(y))'}}))).toEqual({version:1,unlocked:['exp','ln','sub'],solutions:{sub:'eml(ln(x),exp(y))'}});
  });
  it('drops unlocks with missing prerequisites',()=>expect(decodeProgress('{"version":1,"unlocked":["pi","mul"]}').unlocked).toEqual([]));
});
