# Video research and adaptation notes

Original: [A Two-Button Calculator That Does Everything — Numberphile](https://www.youtube.com/watch?v=LxVW3b8jVdE).

Verified attribution: Numberphile, presenter Dr James Grime, video by Brady
Haran and Pete McPartlan. These credits were retrieved from the original
YouTube description. Numberphile’s own
[companion page](https://www.numberphile.com/videos/a-two-button-scientific-calculator)
also identifies James Grime and links the research.

The mathematical source is Andrzej Odrzywołek’s
[All elementary functions from a single operator, arXiv:2603.21852v2](https://arxiv.org/html/2603.21852v2).

## Research method and limits

The original YouTube metadata/description and Numberphile’s official page
were verified. Although YouTube rate-limited an initial automated caption
download, the browser’s transcript exporter subsequently recovered the
English auto-generated captions. Those captions were read in full and
cross-checked against the primary paper. Auto-captions can mistranscribe names
and mathematical notation; names below follow the description and paper.
This is transcript-based analysis, not frame-by-frame visual analysis.
No transcript is redistributed in this repository. Third-party automatic
summaries were not used as mathematical authority.

## Video map

- [0:00–2:43](https://www.youtube.com/watch?v=LxVW3b8jVdE&t=0): the broken-button
  thought experiment and the question of how few mathematical keys suffice.
- [2:43–4:20](https://www.youtube.com/watch?v=LxVW3b8jVdE&t=163): the four-key
  basis, 1/subtraction/exp/ln, and the inverse relationship of exp and ln.
- [4:20–7:54](https://www.youtube.com/watch?v=LxVW3b8jVdE&t=260): zero,
  negation, integers, addition, multiplication, division, powers and roots.
- [7:54–11:26](https://www.youtube.com/watch?v=LxVW3b8jVdE&t=474): complex
  numbers, i, e, π, cosine, sine, tangent and inverse cosine.
- [11:26–13:31](https://www.youtube.com/watch?v=LxVW3b8jVdE&t=686): the
  two-key reduction and the EML definition.
- [13:31–15:27](https://www.youtube.com/watch?v=LxVW3b8jVdE&t=811): recover
  exp, ln and subtraction from EML, in that order. This is the app’s guided start.
- [15:44–17:06](https://www.youtube.com/watch?v=LxVW3b8jVdE&t=944): the
  expression explosion for 1+1 and π, motivating the inspectable recipes.

## Educational structure

The useful progression is to explain why a calculator with 1, subtraction,
exponential and logarithm can reconstruct arithmetic, then show how one
binary operation recovers those functions. EML Lab puts that final primitive
first and gives the learner the reconstruction process as a game.

The core definition is **exp(x) minus ln(y)**, not exp(x minus ln(y)).
We teach these real-input identities:

```text
exp(x) = eml(x, 1)
ln(x)  = eml(1, eml(eml(1, x), 1))
x − y  = eml(ln(x), exp(y))
```

Then zero, negatives, addition, and digits provide familiar stepping stones.
Multiplication and division follow from logarithm identities. Powers lead
to square roots and i; ln(−1) then leads to π. Euler’s formulas lead to
trigonometric functions. The app’s challenge order and copy are original.

## Mathematical details that matter in software

- Complex arithmetic is essential for i, π, and trigonometry, even when
  the intended output is real.
- The paper explicitly discusses the branch sign of the EML-derived
  logarithm on negative real inputs. EML Lab uses the lower branch edge for
  raw EML’s logarithm, with standard principal values for earned ln and
  scientific functions. General complex nesting remains branch-sensitive.
- ln(0) = −∞ and exp(−∞) = 0 can occur in foundation constructions.
- Large EML trees overflow and lose precision. This app evaluates recognized
  recipes through stable identities and documents that distinction. It does
  not promise arbitrary precision or universal complex-domain equivalence.
- Checking finitely many inputs is not a proof. The UI says “verified on
  inputs,” and its field guide states the limit.

## Credit policy

Credit the mathematical discovery to Odrzywołek and the inspiration/explanation
to Numberphile and James Grime. The site links both primary sources and names
the video makers. It reproduces no video, transcript, channel art, or external
calculator code. The MIT license covers this implementation; it does not
relicense third-party media or imply endorsement.
