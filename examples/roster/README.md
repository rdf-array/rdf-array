# A shift roster with days off as empty slots

*Example, 2026-11-02, on the `rdf-undef` branch. A week's roster is a sequence of seven shifts, Monday
to Sunday, and a day off is an empty slot, `undef`; the hours worked each day are a sequence of seven
integers with the same slots. [rdf-undef](../../docs/rdf-undef.html) gives the slot its meaning, a hole
that is not a term and not an unknown, and its OWL built-ins (`ra:holes`, `ra:DenseSequence`, and
`ra:first` undefined at a hole) let HermiT answer the questions a rota has to answer. Run through
[owlapi-array](https://github.com/rdf-array/owlapi-array) (`UndefReasoningTestCase`) and in Protégé
5.6.9 with owlapi-array's bundle and the [protege-owl-array](https://github.com/rdf-array/protege-owl-array)
reasoner plugin, whose DL Query tab lists the answers of §3 ([the walk-through](../../docs/protege-undef.html)).*

FHIR, the data of the [first example](../fhir/), has no notion of a missing element: a list has the
elements it has. A roster does. "Nothing on Tuesday" is not "something on Tuesday we have not been
told", and a format that cannot write the difference makes the reader guess. Here the two are written
differently and the reasoner keeps them apart.

## 1. The files

| File | What it is |
|---|---|
| [`roster.ttl`](roster.ttl) | the shifts, the workers with their weeks and hours, and the defined classes of §3. Imports the [OWL-array vocabulary](../../vocab/owl-array.ttl), which on this branch declares `ra:holes` and `ra:DenseSequence`. Open this one. |
| [`catalog-v001.xml`](catalog-v001.xml) | maps the import to the file beside it, in the form Protégé reads. |
| [`walkthrough.tsv`](walkthrough.tsv) | the scenario of protege-owl-array's walk-through harness: the queries of §3 with the instances expected, the prefixes, the individuals to show. |
| [`protege/`](protege/) | what the harness recorded: `walkthrough.txt` and the screenshots. |

## 2. The roster

```turtle
#                 Mon    Tue    Wed    Thu    Fri    Sat    Sun
:ann :week  ( :day   undef  :night undef  undef  :day   :day ) ;
     :hours ( 8      undef  12     undef  undef  8      8 ) .
:bob :week  ( undef  :day   :day   :night :day   :day   :day ) .
:cy  :week  ( :day   :day   :day   :day   :day   :day   :day ) .
:dee :week  ( undef  undef  undef  undef  undef  undef  undef ) .   # on leave
:eve :week  ( :night [ a :Shift ] :day undef undef :day :day ) .   # Tuesday's shift not yet decided
:fay :week  ( :day :day :night ) .                                 # three days: not a week
```

A `:Worker` has a `:week`: an `ra:ObjectSequence` of `ra:length` 7 whose members are shifts. The
slots count towards the seven; a week of seven slots, Dee's, is a week. Eve's Tuesday is a blank
node: a shift is rostered, which one is not said. Fay is a `:Person` with a three-day record; add
`:fay a :Worker` and the ontology is inconsistent.

## 3. The questions

Each is a defined class in `roster.ttl` and a DL query; the instances are HermiT's through the
OWL-array expansion, and what Protégé's DL Query tab lists.

| Question | Class expression | Instances |
|---|---|---|
| At least two days off | `:Worker and :week some (ra:holes some xsd:nonNegativeInteger[>= 2])` | ann dee eve |
| No day off | `:Worker and :week some ra:DenseSequence` | cy |
| On leave: seven positions, seven slots | `:Worker and :week some (ra:length value 7 and ra:holes value 7)` | dee |
| A night somewhere | `:Worker and :week some (ra:member some :Night)` | ann bob eve |
| Day shifts only | `:Worker and :week some (ra:member only :Day and ra:member some :Day)` | cy |
| Every position decided | `:Worker and :week some (ra:member only {:day , :night})` | ann bob cy dee |
| Starts with a night | `:Worker and :week some (ra:first some :Night)` | eve |
| Ends with a day | `:Worker and :week some (ra:last some :Day)` | ann bob cy eve |
| Monday off | `:Worker and :week some (ra:first max 0 and not ra:EmptySequence)` | bob dee |
| A day of 12 hours or more | `:Worker and :hours some (ra:memberValue some xsd:integer[>= 12])` | ann bob |
| Short days only | `:Worker and :hours some (ra:memberValue only xsd:integer[<= 8])` | cy dee |
| Hours every day | `:Worker and :hours some (ra:DenseSequence and ra:memberValue only xsd:integer[>= 1])` | cy |
| An empty week | `:Worker and :week some ra:EmptySequence` | (none) |
| A three-day record | `:Person and :week some (ra:length value 3)` | fay |

Four of them are the point of the example:

- **Every position decided** lists Dee, whose week is slots only, and not Eve, whose Tuesday is a
  blank node. A slot is closed: there is nothing there, and `ra:member only` has nothing to check. A
  blank node is open, and `only` is not decided of a sequence holding one.
- **Monday off** is `ra:first max 0`: at a slot, `ra:first` is undefined, and the expansion says so.
  Without that, a reasoner that knows "a non-empty sequence has a first" and "the members are day
  and night" would give Bob's week a first shift in {day, night}.
- **Short days only** lists Dee, who worked no hours at all: `only` over the values is vacuous at a
  slot, as it is of the empty sequence. "Hours every day" adds `ra:DenseSequence`.
- **On leave** is not **an empty week**: `( undef undef undef undef undef undef undef )` has length
  7 and no members; `()` has length 0.

## 4. In Protégé

[protege-undef.md](../../docs/protege-undef.html) is the walk-through: Protégé 5.6.9 with owlapi-array's
bundle and the protege-owl-array plugin opens `roster.ttl` (94 axioms, 9 sequence terms, no triple
left unparsed), **HermiT 1.4.3 (OWL-array)** starts in two seconds and finds the roster consistent,
the Individuals tab shows Dee's inferred types ('Monday off', 'On leave', 'Rested worker', 'Short
days only', Assigned), and the DL Query tab lists the instances of §3 for all 23 queries of
`walkthrough.tsv`. **ELK 0.6.0 (OWL-array)** answers 2 of the 23 as expected: ELK has no datatypes,
so `ra:length` and `ra:holes` are out of its reach, `only` and `max 0` are outside OWL 2 EL, and it
skips Eve's week, which holds a blank node, so even `ra:member some :Night` misses her.

## 5. Run it

```bash
git clone -b rdf-undef https://github.com/rdf-array/protege-owl-array.git
git clone -b rdf-undef https://github.com/rdf-array/rdf-array.git
cd protege-owl-array
./assemble.sh Protege-5.6.9-rdf-undef
JAVA_HOME=$(/usr/libexec/java_home -v 21) \
  Protege-5.6.9-rdf-undef/run.sh ../rdf-array/examples/roster/roster.ttl
```

Then Reasoner ▸ HermiT 1.4.3 (OWL-array) ▸ Start reasoner, and type a class expression of §3 into the
DL Query tab. Protégé displays a sequence as `( day undef night … )`. To change the roster, edit
`roster.ttl` and reload.
