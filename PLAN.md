# EML Lab implementation plan

## Product

An independent, no-account educational calculator inspired by Numberphile’s
two-button calculator video. Visitors learn the primitive, recover the three
foundations, then earn a full scientific keypad through challenges.

## Completed implementation

1. Research and credit the primary sources. Explain the distinction between
   the mathematical construction and floating-point execution, including
   complex logarithm branches and zero limits.
2. Build a responsive two-button Reverse Polish Notation calculator: `1`
   pushes a value, `EML` consumes the last two values, with Undo/Clear controls.
3. Introduce EML, then guide visitors through exp, ln, and subtraction.
4. Build a dependency graph of 33 discoveries: foundations, constants e/0/i/π,
   digits 2–9 (1 is built in), arithmetic, powers, roots, logarithms,
   trigonometric/inverse trigonometric and hyperbolic functions.
5. Validate user formulas with a bounded parser and multiple input samples.
   Accept only the primitive, placeholders and already earned shortcuts.
   Include hints and worked solutions so no one gets permanently stuck.
6. Switch between two-key and earned-key modes. Every shortcut exposes an
   EML construction and inspectable expansion; numeric entry builds recipes
   using earned keys.
7. Save progress in versioned localStorage, with dependency validation,
   cross-tab updates, export/restore, and confirmed reset. No backend needed.
8. Test every challenge recipe, compilation to the primitive grammar,
   negative/zero/complex cases, parser boundaries, and storage corruption.
9. Verify real browser interactions and responsive layout. Add CI, source
   attribution, MIT license, and a Vercel-ready static build.

## Release

- Publish the source repository on GitHub.
- Connect the repository to Vercel, deploy, and verify the returned URL.
- Vercel authorization is an external prerequisite; the app needs no runtime
  environment variables or database provisioned.

## Deliberate scope

Challenge checks are numerical evidence, not symbolic proofs. This is a
learning game with local state, not an anti-cheat platform. Users own their
progress files. Named identities use stable native complex operations;
full EML expansions are inspectable constructions and can be numerically
unstable or branch-sensitive if executed literally.
