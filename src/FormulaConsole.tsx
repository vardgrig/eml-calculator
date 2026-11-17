import { ArrowRight, Code2 } from 'lucide-react';
import type { RefObject } from 'react';

export default function FormulaConsole({
  source,
  onSourceChange,
  x,
  y,
  onXChange,
  onYChange,
  onCalculate,
  inputRef,
  onUseResult,
  hasResult,
}: {
  source: string;
  onSourceChange: (source: string) => void;
  x: string;
  y: string;
  onXChange: (value: string) => void;
  onYChange: (value: string) => void;
  onCalculate: () => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onUseResult: () => void;
  hasResult: boolean;
}) {
  return (
    <form
      className="formula-console"
      aria-label="Calculate an EML formula"
      onSubmit={(event) => {
        event.preventDefault();
        onCalculate();
      }}
    >
      <div className="formula-console-heading">
        <Code2 size="1rem" />
        <h3>Use an EML formula</h3>
      </div>
      <p>Paste a formula, set its inputs, and keep calculating with the result.</p>
      <label htmlFor="calculator-formula">Your expression</label>
      <textarea
        id="calculator-formula"
        ref={inputRef}
        value={source}
        onChange={(event) => onSourceChange(event.target.value)}
        placeholder="eml(x, 1)"
        spellCheck={false}
        aria-describedby="calculator-formula-help"
      />
      <p id="calculator-formula-help" className="formula-console-help">
        Use 1, eml(a, b), x, y, and your earned shortcuts.
      </p>
      <div className="formula-console-inputs">
        <label htmlFor="calculator-x">
          x
          <input
            id="calculator-x"
            value={x}
            onChange={(event) => onXChange(event.target.value)}
            spellCheck={false}
          />
        </label>
        <label htmlFor="calculator-y">
          y
          <input
            id="calculator-y"
            value={y}
            onChange={(event) => onYChange(event.target.value)}
            spellCheck={false}
          />
        </label>
        <button type="button" disabled={!hasResult} onClick={onUseResult}>
          Use result for x
        </button>
      </div>
      <button className="formula-console-submit" disabled={!source.trim()}>
        Calculate & add to stack <ArrowRight size="1rem" />
      </button>
      <p className="formula-console-help">
        Inputs are captured when you add a result. Use the keys above to continue, or change x and
        calculate again.
      </p>
    </form>
  );
}
