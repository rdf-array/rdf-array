---
template: page
title: rdf-undef in Protégé
description: "rdf-array's roster example in Protégé 5.6.9: a week's shifts as a sequence with days off as empty slots, undef; read as one term each with rdf-undef's meaning for the slot, HermiT tells a day off from a shift not yet decided, counts the days off and finds that a week of days off has no first shift."
eyebrow: rdf-array · rdf-undef in Protégé · demo
---
# Protégé reasons about days off

A week's roster is a list of seven shifts, and some days nothing is rostered. Written as
`( :day undef :night undef undef :day :day )` and read as [rdf-undef](rdf-undef.html), the list is one
term with three empty slots; [OWL-array](owl-array.html) with rdf-undef's two built-ins gives the slot
a meaning; Protégé 5.6.9, with one bundle swapped and one plugin added, counts the days off, tells a
day off from a shift still to be decided, and knows that a week starting with a day off has no first
shift. Protégé itself is not modified.

The data is rdf-array's [roster example](../examples/roster/index.html). The FHIR example of
[protege-array.md](protege-array.html) could not have shown this: FHIR's data model has no missing
element, so its lists have no slots. A roster does, and the two ways of having nothing at a position,
a slot and a blank node, are both in the data. Two jars make it run.
[owlapi-array](https://github.com/rdf-array/owlapi-array)'s `rdf-undef` branch replaces Protégé's OWL
API bundle under the same symbolic name and version;
[protege-owl-array](https://github.com/rdf-array/protege-owl-array)'s adds **HermiT 1.4.3 (OWL-array)**
to the Reasoner menu, the bundled HermiT behind a decorator that hands it the meaning of each list,
slots included. The screenshots are Protégé's own window, painted to PNG by the walk-through harness;
its log is [walkthrough.txt](../examples/roster/protege/walkthrough.txt). Click a detail for the whole
window.

## A slot is not a blank node

```turtle
:dee :week ( undef  undef  undef  undef  undef  undef  undef ) .   # on leave: nothing any day
:eve :week ( :night [ a :Shift ] :day undef undef :day :day ) .   # Tuesday: a shift, not yet which
```

Dee's week says that nothing is rostered on any day, and it is closed: there is nothing more to learn
about it. Eve's Tuesday says that a shift is rostered and does not say which: a blank node, an
unknown. rdf-undef.md §1 draws the line, and the reasoner keeps to it. "Every position decided",
`:week some (ra:member only {:day , :night})`, is true of Dee, whose week has no members for `only`
to check, and not of Eve, whose Tuesday could be any shift.

## What rdf-undef adds to OWL-array

Nothing changes in the semantics of a sequence but what a tuple's element may be: beside the
individuals, data values and sequences, a distinguished *hole*, equal only to a hole. The built-ins
of OWL-array keep their meaning, each stated over the elements that are individuals or values, so
`ra:member` sees past a hole, `ra:length` counts it, and `ra:first` has no value when the first
position is one. Two built-ins are added:

| Built-in | In every interpretation, for a sequence `s` |
|---|---|
| `ra:holes` | functional: the number of empty slots of `s` itself, an `xsd:nonNegativeInteger` |
| `ra:DenseSequence` | `ra:Sequence and ra:holes value 0`: no empty slot |

Two things the expansion learned to say (rdf-undef.md §4.2). An end that is a slot gets
`ra:first max 0 and ra:firstValue max 0`: without it, HermiT read "a non-empty sequence has a first"
together with "the members are day and night" and gave Bob's week a first shift in {day, night}. And
that axiom of the vocabulary now speaks of dense sequences: under the old one, `( undef )`, non-empty
with no members, was inconsistent.

## Set it up

Git, Maven and a JDK 11 or newer. `assemble.sh` on the `rdf-undef` branch starts from the stock
Protégé 5.6.9 zip and swaps in the two jars, built from source on the first run:

```bash
git clone -b rdf-undef https://github.com/rdf-array/protege-owl-array.git
git clone -b rdf-undef https://github.com/rdf-array/rdf-array.git
cd protege-owl-array
./assemble.sh Protege-5.6.9-rdf-undef
JAVA_HOME=$(/usr/libexec/java_home -v 21) \
  Protege-5.6.9-rdf-undef/run.sh ../rdf-array/examples/roster/roster.ttl
```

The `java_home` line is macOS; elsewhere set `JAVA_HOME` to any JDK 11 or newer. `roster.ttl` imports
the OWL-array vocabulary, whose `rdf-undef` version declares `ra:holes` and `ra:DenseSequence` so that
the DL Query tab knows the names; `catalog-v001.xml` maps the import to the file beside it.

## Open it; every list is parsed

Protégé opens `roster.ttl` and its import: 2 ontologies, 160 axioms, no triple left unparsed, 9
distinct sequence terms in 10 axioms.

[![Protégé's Active ontology tab for roster.ttl.](../examples/roster/protege/loaded.png
"The Active ontology tab after opening `roster.ttl`.")](../examples/roster/protege/loaded.png)

Dee before reasoning: her `week` and `hours` are one term each, the same term, which Protégé
displays by its `_:seq_…` node ID (the slots are inside it, invisible here; the file has them).

[![The Individuals tab for Dee: type Worker, and the property assertions week and hours, each a
term whose name begins with _:seq_.](../examples/roster/protege/detail-dee.png
"Dee before reasoning: `week` and `hours` are sequence terms, and the same one.")](../examples/roster/protege/dee.png)

## Start the reasoner

Reasoner ▸ **HermiT 1.4.3 (OWL-array)** ▸ Start reasoner: two seconds, consistent. Dee's inferred
types, in yellow: 'Monday off', 'On leave' and 'Short days only' in the Description view, which
shows the most specific ones; 'Rested worker' and Assigned are in the log's full list.

[![The Individuals tab for Dee with the reasoner running: the inferred types 'Monday off', 'On
leave' and 'Short days only'.](../examples/roster/protege/detail-dee-inferred.png
"Dee with HermiT (OWL-array) running: a week of slots is on leave, off on Monday, and worked only short days.")](../examples/roster/protege/dee-inferred.png)

Eve: 'Ends with a day', 'Rested worker', 'Starts with a night' ('Night worker' follows from the
last); not Assigned.

[![The Individuals tab for Eve with the reasoner running: the inferred types 'Ends with a day',
'Rested worker' and 'Starts with a night'.](../examples/roster/protege/detail-eve-inferred.png
"Eve: two days off count, the blank node on Tuesday keeps her out of Assigned.")](../examples/roster/protege/eve-inferred.png)

## Ask the DL Query tab

### Days off: `ra:holes`

[![The DL Query tab with the query 'Rested worker'. Instances: Ann, Dee and
Eve.](../examples/roster/protege/detail-query-rested.png
"'Rested worker', at least two days off: `:week some (ra:holes some xsd:nonNegativeInteger[>= 2])`.")](../examples/roster/protege/query-rested.png)

### A week of days off is not an empty week

[![The DL Query tab with the query 'On leave'. Instances:
Dee.](../examples/roster/protege/detail-query-on-leave.png
"'On leave': `ra:length value 7 and ra:holes value 7`. `ra:EmptySequence` lists nobody.")](../examples/roster/protege/query-on-leave.png)

### A slot is closed, a blank node is open

[![The DL Query tab with the query Assigned. Instances: Ann, Bob, Cy and
Dee.](../examples/roster/protege/detail-query-assigned.png
"Assigned, `:week some (ra:member only {:day , :night})`: Dee yes, Eve no.")](../examples/roster/protege/query-assigned.png)

### No first shift: `ra:first` at a slot

[![The DL Query tab with the query 'Monday off'. Instances: Bob and
Dee.](../examples/roster/protege/detail-query-monday-off.png
"'Monday off', `:week some (ra:first max 0 and not ra:EmptySequence)`: Bob's week starts with undef.")](../examples/roster/protege/query-monday-off.png)

### `only` is vacuous at a slot

[![The DL Query tab with the query 'Short days only'. Instances: Cy and
Dee.](../examples/roster/protege/detail-query-short-days.png
"'Short days only', `:hours some (ra:memberValue only xsd:integer[<= 8])`: Dee worked no hours, and every one of them was short.")](../examples/roster/protege/query-short-days.png)

All 23 queries of [walkthrough.tsv](../examples/roster/walkthrough.tsv) list in the tab the instances
that HermiT finds through the OWL API; the table is [§3 of the example](../examples/roster/index.html#the-questions).

## Limits, as found

- **ELK sees no counts.** **ELK 0.6.0 (OWL-array)** answers 2 of the 23 queries as expected: ELK has
  no datatypes, so `ra:length`, `ra:holes` and `ra:DenseSequence` (which is `ra:holes value 0`) are
  out of its reach; `only` and `max 0` are outside OWL 2 EL; and it skips Eve's week, which holds a
  blank node, so `ra:member some :Night` and `ra:last some :Day` list everyone but her.
- **Saving round-trips as Turtle, not as RDF/XML.** The harness saves `roster.ttl` as Turtle and
  reads it back with the same axioms; RDF/XML refuses, naming the sequence: `rdf:parseType="Collection"`
  holds node elements only, and a slot is none ([#18](https://github.com/rdf-array/rdf-array/issues/18)
  was the literal element).
- **The slots are invisible in the editor.** A sequence displays by its node ID; the Manchester
  renderer writing `( :day undef :night … )` is the fix, on both branches' lists.
- **The inner positions are invisible to the reasoner.** The expansion tells `( 1 undef )` from
  `( undef 1 )` by the ends and from `( 1 2 )` by the count of holes, but not `( 1 undef 2 3 )` from
  `( 1 2 undef 3 )`, as it did not tell `( 1 2 3 4 )` from `( 1 3 2 4 )` before: sound and incomplete
  for `owl:differentFrom`.
- **No `HasKey`** for identity under `owl:sameAs` of elements, on either branch; with slots it would
  be one key per length and pattern of holes.

---

Run on 2026-11-02: Protégé 5.6.9 (platform-independent zip) on Java 21, macOS, with owlapi-array and
protege-owl-array 0.1.0 from their `rdf-undef` branches, built from source. Sources:
[examples/roster](https://github.com/rdf-array/rdf-array/tree/rdf-undef/examples/roster) · the
example's [write-up](../examples/roster/index.html) · [rdf-undef](rdf-undef.html) ·
[OWL-array](owl-array.html) · [protege-owl-array](https://github.com/rdf-array/protege-owl-array) ·
[owlapi-array](https://github.com/rdf-array/owlapi-array).
