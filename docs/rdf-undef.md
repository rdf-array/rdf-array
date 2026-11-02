# rdf-undef: empty slots in sequences

*Design note, 2026-11-01, on the `rdf-undef` branch of the repositories, which branches from
`rdf-sequences`. Prototyped in jena-array (the tests in `TestUndefSlots`), owlapi-array
(`UndefReasoningTestCase`) and protege-owl-array (the [roster](../examples/roster/) walk-through), each
on its branch `rdf-undef`. This is a strawman: §6 lists the decisions that are still open.*

rdf-undef extends the data model of [rdf-array.md](rdf-array.html) with one thing: a position in a
sequence may be empty.

```turtle
:x :p ( 1 undef 3 ) .
```

That sequence has three positions and nothing at the second. The marker is `undef`, the word SPARQL
already uses for "no value here" in `VALUES`.

## 1. What a slot is

A slot is a position with no value. Three consequences carry through everything below:

- **It is not a term.** `undef` occurs only as a member of a sequence, at any depth. `:s :p undef` and
  `undef :p 1` are syntax errors, in Turtle, N-Triples and SPARQL alike. A variable is never bound to
  it.
- **It is not an unknown value.** `( 1 _:b 3 )` already says "there is something at the second position
  and I am not saying what". `undef` says there is nothing there, so `( 1 2 3 )` does not entail
  `( 1 undef 3 )`, nor the reverse. This follows from [owl-array.md](owl-array.html) §3.1, "a sequence
  is closed".
- **It counts.** `( 1 undef 3 )` has length 3. Two sequences are the same term when their members and
  their slots line up: `( 1 undef )` is `( 1 undef )`, and is different from `( 1 )`, `( undef 1 )` and
  `( 1 2 )`.

## 2. Syntax

Turtle, TriG, N-Triples and N-Quads take `undef` as a sequence member, in any case, as SPARQL does.
Writers emit `undef`. A prefix may still be called `undef:`, since the tokenizer reads `undef:x` as a
prefixed name.

SPARQL takes it as a member of a sequence in patterns, templates and data blocks, and as an argument of
`SEQ`: `( ?a undef ?c )`, `SEQ(1, undef, 3)`. It is not an expression elsewhere, so
`BIND(undef AS ?x)` is a syntax error. `VALUES ?x { undef }` keeps its meaning.

Result formats reuse their own word for no value: `{ "type": "undef" }` as a member of a JSON `seq`, and
`<unbound/>` as a child of an XML `<seq>`. SSE writes `(seqterm 1 undef 3)`.

## 3. SPARQL

The rule for variables comes from `VALUES`: `UNDEF` there leaves a variable unbound, and an unbound
variable joins with anything. A slot does the same. Over `:x :p ( 1 undef 3 )` and `:y :p ( 1 2 3 )`:

| Query part | Result |
|---|---|
| `?s :p ( ?a ?b ?c )` | at `:x`, `?a` is 1, `?c` is 3 and `?b` is unbound; at `:y`, all three are bound |
| `?s :p ( ?a undef ?c )` | only `:x`: `undef` in a pattern matches only a slot |
| `?s :p ( 1 2 3 )` | only `:y`: a constant does not match a slot |
| `?s :p ( ?a ?b )` | nothing: the length still has to match |
| `VALUES ?b { 5 } ?s :p ( ?a ?b ?c )` | `:x` with `?b` 5, joined as with any unbound variable; not `:y`, which has 2 |
| `:x :p ( ... ?m ... )` | three solutions, one with `?m` unbound |
| `:x :p ( ?h ...?t )` | `?t` is `( undef 3 )`: a named gap keeps slots |
| `UNNEST(?s AS ?m AT ?i)` | three solutions; at `?i` 2, `?m` is unbound; `FILTER(BOUND(?m))` drops it |
| `?s[2]` | an error, as out of range is, so `BIND` leaves its variable unbound and `COALESCE(?s[2], 0)` gives a default |
| `?s[2...3]` | `( undef 3 )`: slices keep slots |
| `SEQLEN(?s)` | 3 |
| `3 IN ?s`, `2 IN ?s` | true, false: `IN` looks at members, and a slot has none |
| `?s = SEQ(1, undef, 3)`, `?s = SEQ(1, 2, 3)` | true, false |
| `SEQ(?c, ?b, ?a)` | `( 3 undef 1 )` when `?b` is unbound; any other error in an argument is the error of the whole `SEQ` |
| `CONSTRUCT { ?s :q ( ?c ?b ?a ) }` | `:x :q ( 3 undef 1 )`: an unbound variable in a template's sequence is a slot, so what a pattern reads, a template writes back |
| `ORDER BY ?s` | a slot sorts before every term, member by member |

Bottom-up evaluation has to give the same answer as an engine that substitutes bindings into a pattern,
and two things in Jena had to change for that:

- A variable bound earlier is compatible with a slot, yet a written constant must not match one. So the
  matcher works from the pattern before substitution, and a sequence pattern is not looked up in the
  graph by its substituted form.
- A variable inside a sequence pattern is no longer certain to be bound. The optimizer's analyses
  (`VarFinder`, `OpVars.fixedVars`) now count those variables as optional, and so the `UNNEST` variable
  too, so that joins and filter placement stay correct. Queries without slots return the same answers,
  though some joins may now use a less specialised strategy.

## 4. OWL

Implemented in owlapi-array and run in Protégé on 2026-11-02 (§4.1). The point of writing the plan
before the code was to check that §1 and §3 leave it possible; §4.2 has what the reasoner then found.

The direct semantics of owl-array.md §3.1 gives sequences as tuples of denotations. rdf-undef adds one
thing to what a tuple's element may be, a distinguished *hole*, which is not in the object or data
domain:

- **Denotation.** `( t1 … undef … tn )` denotes the tuple with a hole at that position. A hole denotes
  itself in every interpretation.
- **Identity.** Still by elements, pairwise, with a hole equal only to a hole. So
  `( 1 undef ) owl:differentFrom ( 1 2 )` holds in every interpretation, and `owl:sameAs` between members
  never reaches a hole.
- **Closure.** A sequence stays closed, and later data cannot fill a hole.

The built-ins of owl-array.md §3.2 need no change of meaning, since each is already stated over elements
that are individuals or values:

| Term | At a hole |
|---|---|
| `ra:length` | counts it: `( 1 undef 3 ) ra:length 3` |
| `ra:member`, `ra:memberValue` | no assertion, so `ra:member only C` holds vacuously at a hole, as it already does at a literal (§3.5) |
| `ra:first`, `ra:last` and the `Value` forms | no value when the first or last position is a hole; they are already partial |

One addition is needed, because `ra:member only C` can no longer say "every position holds a `C`":

| New term | Kind | Meaning |
|---|---|---|
| `ra:holes` | functional data property | the number of holes of `s`, an `xsd:nonNegativeInteger` |
| `ra:DenseSequence` | defined class | `ra:Sequence and ra:holes value 0` |

Entailments, given `ex:r ex:rgb ( 255 undef 0 )`:

- `( 255 undef 0 ) ra:length 3` and `ra:holes 1`;
- `( 255 undef 0 ) ra:memberValue 255`, and `ra:memberValue 0`;
- `( 255 undef 0 ) a ra:DataSequence`, and not `ra:DenseSequence`;
- with `ex:r a ex:Swatch`, a class requiring `ex:rgb only (ra:length value 3 and ra:memberValue only
  xsd:integer)`, the ontology stays consistent; adding `ra:DenseSequence` to that requirement makes it
  inconsistent;
- `( undef ) a ra:ObjectSequence` and `ra:DataSequence`, vacuously, and not `ra:EmptySequence`, since its
  length is 1;
- `ex:r ex:rgb ( 255 7 0 )` is not entailed, for any value in place of the 7.

The expansion of owl-array.md §6 stays linear and stays within OWL 2 DL: it emits no member assertion
for a hole, it counts holes for `ra:length` and `ra:holes`, it spells `undef` in the canonical IRI so
that equal terms keep one individual, and the `HasKey` axioms per length (still not implemented) would
apply per pattern of holes, since sequences with holes in different places are different.

### 4.1 As implemented

owlapi-array, branch `rdf-undef` (its `doc/rdf-array.md` has the detail): `OWLUndef` is an element
of an `OWLSequence` and nothing else, one object, spelled `undef` in the node ID; the Turtle parser and
writer take it, RDF/XML refuses it as it refuses a literal element, and a slot in one of OWL's own
lists is a parse error. `SequenceAxioms` expands as above, plus one thing the plan missed: with the
closure, an end that is a hole gets `ra:first max 0 and ra:firstValue max 0` (or `last`). The
vocabulary (vocab/owl-array.ttl on this branch) gains `ra:holes` and `ra:DenseSequence`, and its
axiom "a non-empty sequence has a first and a last" is restated for dense sequences. Protégé runs it
through protege-owl-array's bundle; [protege-undef.md](protege-undef.html) walks through the
[roster example](../examples/roster/), a week's shifts with days off as slots.

### 4.2 What the reasoner found

Each is a test in `UndefReasoningTestCase`, against HermiT.

- **The phantom first.** `( undef 2 3 )` has no first. The vocabulary said that a non-empty sequence
  has a first or a first value, and the closure said the values are 2 and 3, so HermiT concluded
  `ra:firstValue some {2, 3}`; and `( undef )`, non-empty with no members, was inconsistent. Two
  changes: the axiom now speaks of `ra:DenseSequence and not ra:EmptySequence`, and the expansion
  says of a hole at an end that there is no first (last). `ra:first` over `( undef 2 3 )` is then
  undefined, `ra:last` is 3, and `ra:first max 0` holds: "Monday off" is `ra:first max 0 and not
  ra:EmptySequence`.
- **"No members" no longer means empty.** `( undef )` is `ra:member max 0 and ra:memberValue max 0`,
  not `ra:EmptySequence` (length 1), and vacuously both `ra:ObjectSequence` and `ra:DataSequence`, as
  `()` is. An ontology that defined emptiness by the absence of members now admits every all-slot
  sequence; `ra:EmptySequence` is defined by length and is unchanged.
- **`ra:member` counts members, `ra:length` positions.** `( ex:a undef ex:b )` with `ex:a` and
  `ex:b` different is `ra:member exactly 2` and `ra:length value 3`. "Every position holds a `C`" is
  now three conjuncts: `ra:DenseSequence and ra:ObjectSequence and ra:member only C`.
- **`only` is vacuous at a slot.** `ra:memberValue only xsd:integer[<= 8]` holds of a sequence of
  slots, so "short days only" lists a worker on leave; `ra:member only :Shift` holds of a week of
  days off but not of a week holding a blank node, which is the difference between a slot and an
  unknown made visible.
- **Which sequences the expansion tells apart.** `( 1 undef ) owl:differentFrom ( 1 2 )` follows from
  `ra:holes` being functional, `( 1 undef ) owl:differentFrom ( undef 1 )` and
  `( undef 2 3 ) owl:differentFrom ( 2 undef 3 )` from the end closure. `( 1 undef 2 3 )` and
  `( 1 2 undef 3 )` are not told apart, as `( 1 2 3 4 )` and `( 1 3 2 4 )` were not before: the
  expansion is sound and incomplete for `owl:differentFrom`, and the inner positions are what it
  cannot see. Positional properties, if ever added, would close this; a slot is simply a position
  without a value for them.
- **Holes are not counted through nesting.** `( ( undef ) )` is `ra:DenseSequence` and
  `ra:member some (ra:holes value 1)`. Depth-two density is `ra:member only ra:DenseSequence`.
- **A sequence with a slot is a nominal like any.** `ex:Holey EquivalentTo: ex:rgb value ( 1 undef )`
  classifies the individuals with that value, and `( 1 undef )` written twice is one individual.
- **OWL 2 EL (closure off).** `ra:DenseSequence` is `ra:holes value 0`, which EL has, and functional
  data properties are in EL too, so density and sparseness are decided without the closure; `only`
  and `max 0` still need it. (Moving the functional data properties out of the closure-only set also
  cured a HermiT oddity: its first `isEntailed` about `ra:DenseSequence`, before any realisation,
  answered false.)
- **A slot in one of OWL's own lists** (`owl:unionOf ( ex:A undef )`) is an error, not an empty
  union: the lax reading of a non-list hid it.
- **Found on the way**: owlapi-array's reasoner decorator expanded a sequence named only by a query
  once and then forgot it had not, so a second `isEntailed` naming the same foreign sequence answered
  over an individual with no axioms. Fixed on both `rdf-sequences` and `rdf-undef`.

### How the SPARQL semantics keeps this open

| Choice in §1 and §3 | What it preserves |
|---|---|
| A slot is never a term and a variable never binds it | OWL needs no individual for it, and `ra:member` needs no exception |
| A constant does not match a slot | An entailment regime stays sound: `( 1 2 3 )` is not entailed by `( 1 undef 3 )`, and SPARQL does not claim it |
| `=` is false between a slot and a value | The same answer as `owl:differentFrom` |
| `IN` skips slots | The same answer as `ra:member` and `ra:memberValue` |
| Length counts slots | The same answer as `ra:length` |
| `undef` matches only a slot, by term | `( 1 undef ) owl:sameAs ( 1 undef )` is simple identity |

The one thing that would have to change is the reading of `undef` itself. If it meant "unknown", then
`( 1 undef ) = ( 1 2 )` would be an error and not false, `2 IN ( 1 undef )` likewise, and a sequence with
a slot would be anonymous under owl-array.md §3.1, barred from `owl:hasValue` and `owl:oneOf`. Those are
few changes in code, but the OWL semantics would need an existential reading, which `( 1 _:b )` already
gives. That is the case against it.

## 5. The rest of the stack

Implemented as of 2026-11-02, each on its own `rdf-undef` branch, with §1–§3 as Jena has them:

| Area | Where | What it did |
|---|---|---|
| Shared tests, ShEx, SHACL, JSON-LD | shexTest-contrib, data-shapes-contrib, json-ld-api-contrib | `undef-*` tests on their `rdf-undef` branches, as the rows below say. The W3C suite forks change nothing, since a slot is opt-in or new syntax. |
| Shared tests | rdf-tests-contrib | `undef-*`, requiring `ra:UndefSlots`: 27 syntax tests across Turtle, TriG, N-Triples and N-Quads (positive and negative), §3's table as 48 evaluation tests, 4 updates, 10 further SPARQL syntax tests, and results in JSON and XML. Generated from Jena; `bin/build.py` cross-checks them against N3.js and Comunica. |
| Jena | jena-array | The reference (`TestUndefSlots`). The contrib results tests found that `ResultSetCompare` could not compare a slot; fixed. |
| OWL | owlapi-array, protege-owl-array | §4. Protégé shows a sequence as `( day undef night … )`: the Manchester object renderer writes it and the Manchester parser reads it, in an individual's position and after `value`. A saved Manchester document keeps the reversible `_:seq_…` node ID. |
| RDF/JS terms and syntax | types, rdf-data-factory, rdf-string, rdf-string-ttl, rdf-terms, N3.js, n3writer-wrapper, lezer-turtle | An element of `termType` `Undef`, refused in quad positions by the types and the factory. N3.js reads and writes it, and `Sequence.value` spells it `(1 undef 3)`. |
| RDF/XML | rdfxml-streaming-parser | No spelling, and this is only a parser, so no code changed. owlapi-array's writer refuses a slot and rdflib-array's RDF/XML refuses sequences. |
| Results | sparqljson-parse, sparqlxml-parse, rdf-test-suite | `{"type":"undef"}` and `<unbound/>`, read back and compared. |
| SPARQL in JavaScript | traqula, comunica | A bind join cannot write a value into a sequence pattern, since a constant does not match a slot: Comunica leaves the variable in place and filters with `!BOUND(?b) || sameTerm(?b, value)`. Variables inside sequence patterns and the `UNNEST` variable are `canBeUndef`. |
| Python | rdflib-array | Term, parsers, serializers, SPARQL, results. It has no fixed-variables analysis, so only the matching changed. |
| Rust | oxigraph-array, rudof-array | oxrdf, oxttl, spargebra, sparopt, spareval, sparesults and the store's encoding. rudof takes the term from Oxigraph. |
| ShEx | jena-shex, shex.js, lezer-shexc, pyshexc, ShExJSG, PyShEx, CFGraph, rudof, shexTest-contrib | No value constraint is met at a slot, `.` included, and a member expression writes `undef` to allow one: `LIST ( ( xsd:integer \| undef ) * )`, for any length. `LIST ( xsd:integer \| undef ) *` is a one-member list, since a cardinality after the list belongs to the triple constraint; `LIST * undef` is short for `LIST ( undef * )`. `undef` is not a shape expression, so `undef OR x` and `:p undef` are syntax errors. A sequence holding a slot still satisfies `.` as a whole value. ShExJ `{ "type": "Undef", "min": m, "max": n }`, beside `Member` in `listExpr`; ShExR `sx:Undef`. |
| SHACL | jena-shacl, data-shapes-contrib, rudof | A slot conforms to no member shape, so `sh:memberShape` fails there, even for a shape with no constraints, and there is no new constraint. This is stricter than `ra:member only C` in OWL (§4), where `only` is vacuous at a hole. `sh:minListLength` and `sh:maxListLength` count slots. In `sh:uniqueMembers` a slot equals only a slot, so `( undef undef )` repeats a member. A slot in a list in a shapes graph (`sh:in`, `sh:or`, paths, `sh:ignoredProperties`) makes it ill-formed. rudof has no `sh:memberShape`, so it does only this last part. |
| JSON-LD | jsonld-streaming-parser, jsonld-streaming-serializer, jsonld.js, rdflib, Oxigraph, json-ld-api-contrib | `null` as a member of a list is a slot under the processing option `undefSlots`, at any depth and in `@container: @list` arrays; `"p": null`, `"@list": null`, `{"@value": null}` and a `null` outside a list stay dropped. Without the option JSON-LD 1.1 stands, and a serializer refuses a slot with an error naming the sequence. jsonld.js has expand, compact, flatten and `arrayToRDF`; its `toRDF` makes ladders, which cannot hold a slot, so it refuses. |

The implementations agree on every row of §3's table and on the contrib tests. What this turned up:

- **`VALUES` holds no sequences**, with or without a slot, in Jena and Oxigraph, so §2's "data blocks" is reached only by `INSERT DATA` and `DELETE DATA`.
- **CSV differs, as it did before slots.** Jena writes `?` for any sequence, and Comunica and Oxigraph write it out, so the suite has no slot case for CSV.
- **JSON-LD implementations differ where neither is a slot.** An array directly in `@list`, `{"@list": [[1]]}`, nests in jsonld.js, the streaming parser and rdflib and flattens in Oxigraph; `{"@list": null}` gives an empty node in jsonld.js and rdflib and no triple in the streaming parser. Neither is in the suite.
- **N3** does not read `undef` in Oxigraph, since this note names Turtle, TriG, N-Triples and N-Quads.

These are still to do, on their own `rdf-undef` branches:

| Area | Question |
|---|---|
| RDF Thrift, Protobuf, TDB | Sequences need checking in each first; a slot is one more case once they carry sequences. |
| Jena's model API | `Node.UNDEF` can reach callers of `getSeq()` and `GraphList`; these should say what they return at a slot. |
| OWL `HasKey` | Not implemented without slots either; with them, one key per length and pattern of holes (§4). |

## 6. Open decisions

1. **A variable at a slot stays unbound.** The alternative is that `( ?a ?b ?c )` does not match
   `( 1 undef 3 )`, and only `undef` or a gap reaches past a slot. That keeps "a pattern binds all its
   variables", which the optimizer relies on, and it is simpler; but it treats `UNNEST` and `[i]`
   differently, and it hides the data from a query that does not expect slots.
2. **A variable bound elsewhere joins through a slot.** `VALUES ?b { 5 } ?s :p ( ?a ?b ?c )` returns `:x`
   with `?b` 5, though `:x` has no 5. This follows from the join and from `VALUES`, and it may still
   surprise.
3. **`( ... ?m ... )` and `UNNEST` give a solution at a slot.** The alternative, like JavaScript's
   `forEach`, skips slots; `UNNEST` would then still have to number the rest by position.
4. **An unbound variable in a template's sequence writes a slot.** It makes `CONSTRUCT` round-trip, but
   a mistyped variable now gives a hole where it used to drop the triple. The same holds for
   `SEQ(?unbound)`.
5. **A slot is a hole and not an unknown value** (§4). The rest follows from this one.
6. **`undef` is case insensitive in Turtle.** This matches SPARQL, though `true` and `false` are case
   sensitive in Turtle.
