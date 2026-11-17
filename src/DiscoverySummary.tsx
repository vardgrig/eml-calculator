import { useMemo } from 'react';
import { Check, Code2 } from 'lucide-react';
import { expand, expressionStats, parse, printBounded, type Definition, type Expr } from './engine';

export default function DiscoverySummary({
  definition,
  recipe,
  onInspect,
}: {
  definition: Definition;
  recipe: string;
  onInspect: (expression: Expr) => void;
}) {
  const summary = useMemo(() => {
    try {
      const expression = parse(recipe);
      const expanded = expand(expression);
      return {
        expression,
        expansion: printBounded(expanded, 6000),
        stats: expressionStats(expanded),
      };
    } catch {
      return null;
    }
  }, [recipe]);
  const invocation = `${definition.id}${definition.arity === 0 ? '' : definition.arity === 1 ? '(x)' : '(x, y)'}`;

  return (
    <section className="discovery-summary" aria-label="Your discovery in both forms">
      <div className="discovery-summary-heading">
        <span>
          <Check size="0.875rem" /> KEY DISCOVERED
        </span>
        <b>{definition.label}</b>
      </div>
      <div className="discovered-shortcut">
        <span>YOUR NEW SHORTCUT</span>
        <code>{invocation}</code>
      </div>
      <div className="discovered-form">
        <h4>Your verified recipe</h4>
        <code>{recipe}</code>
      </div>
      <div className="discovered-form">
        <div className="two-key-heading">
          <h4>With just two keys</h4>
          <span className="primitive-badges" aria-label="Only 1 and EML">
            <span>1</span>
            <span>EML</span>
          </span>
        </div>
        {summary ? (
          <>
            <pre className="discovered-expansion" tabIndex={0} aria-label="Expanded EML recipe">
              {summary.expansion}
            </pre>
            <div className="discovery-summary-meta">
              <span>{summary.stats.nodes.toLocaleString()} button presses</span>
              <button onClick={() => onInspect(summary.expression)}>
                <Code2 size="0.8125rem" /> Inspect & copy
              </button>
            </div>
          </>
        ) : (
          <p className="tiny muted">
            This recipe is too large to expand here. You can still use your earned key.
          </p>
        )}
      </div>
      <p className="discovery-explanation">{definition.explanation}</p>
    </section>
  );
}
