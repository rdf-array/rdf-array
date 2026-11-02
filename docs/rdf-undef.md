# rdf-undef: empty slots in sequences

*Design note, 2026-11-01, on the `rdf-undef` branch of the repositories, which branches from
`rdf-sequences`. Prototyped in jena-array, branch `rdf-undef`, with the tests in `TestUndefSlots`. This
is a strawman: §6 lists the decisions that are still open. OWL is planned here (§4) and not implemented.*

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

## 4. A plan for OWL

Nothing here is implemented. The point of writing it now is to check that §1 and §3 leave it possible.

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
that equal terms keep one individual, and the `HasKey` axioms per length apply per pattern of holes,
since sequences with holes in different places are different.

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

The prototype covers Jena's RDF parsers and writers, SPARQL and its result formats. These are still to
do, on their own `rdf-undef` branches:

| Area | Question |
|---|---|
| ShEx `LIST` | Does a slot satisfy a member? Suggested: no value constraint is met at a slot, and a member expression says `undef` to allow one, as in `LIST ( xsd:integer | undef ) *`. |
| SHACL | Suggested: `sh:memberShape` skips slots, matching `ra:member`, and a separate constraint rules them out. |
| JSON-LD | `null` in a list is the natural spelling, though JSON-LD 1.1 drops it, so this needs a flag or a new keyword. |
| RDF/XML, RDF Thrift, Protobuf, TDB | Sequences need checking in each first; a slot is one more case once they carry sequences. |
| Jena's model API | `Node.UNDEF` can reach callers of `getSeq()` and `GraphList`; these should say what they return at a slot. |
| Shared suites | `*-contrib` and the `*-array` suites gain the tests, once §6 is settled, from `TestUndefSlots`. |

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
