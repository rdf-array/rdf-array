# OWL-array: OWL over rdf-array

*Definition, 2026-10-26; implemented in
[owlapi-array](https://github.com/rdf-array/owlapi-array) (OWL API 4.5.29, the 4.5 line that
Protégé 5.6 loads), 2026-10-26; a worked example over FHIR RDF, [examples/fhir](../examples/fhir/index.html),
2026-10-27; revised 2026-11-06: a sequence is an individual per occurrence, not identified by its
elements, and `ra:tupleOf` names the sequences with given elements ([§10](#identity-the-alternatives)
compares the alternatives and reports the experiments behind the choice). This document is [owl-array.md](https://github.com/rdf-array/rdf-array) in the
organisation's meta-repository, rendered at <https://rdf-array.github.io/rdf-array/docs/owl-array.html>;
[rdf-array.md](rdf-array.html) describes the change from RDF to rdf-array, and
[shacl-array.md](shacl-array.html) settles the same questions for SHACL. The `.claude/skills/owl-array`
skill in the same repository carries the implementation plan.*

OWL-array is OWL 2 ([OWL 2 Direct Semantics], [OWL 2 Mapping to RDF Graphs]) over the rdf-array data
model, in which `( … )` is one term, a *sequence*, and `()` is the empty sequence. It changes two
things and adds one small vocabulary:

1. **OWL's own lists are sequences.** The RDF mapping of OWL 2 spells the arguments of
   `owl:unionOf`, `owl:intersectionOf`, `owl:oneOf`, `owl:members`, `owl:propertyChainAxiom`,
   `owl:hasKey`, `owl:disjointUnionOf`, `owl:withRestrictions` and SWRL's `swrl:body` and
   `swrl:head` as RDF lists. Read with Turtle-array they are sequences, and a sequence is the only
   list: an `rdf:first`/`rdf:rest` ladder is triples (§2).
2. **A sequence in the data is an individual with built-in structure.** `ex:paper bibo:authorList
   ( ex:ada ex:alan )` holds one term. OWL-array reads that term as an individual of the class
   `ra:Sequence` whose members, length, first and last element are given by properties with a
   meaning the semantics fixes: `ra:member`, `ra:memberValue`, `ra:length`, `ra:first`, `ra:last`.
   Two sequences with the same elements are not thereby one individual; the class
   `ra:tupleOf ( … )` picks out the sequences with given elements.
   Nothing about the term is asserted in triples, nothing is reserved vocabulary, and a class
   expression can constrain the members of a list-valued property while staying in OWL 2 DL (§3).

The second is the reason to do it. FHIR RDF writes a repeated element as a list, and its ontology
could not say what the list holds; in OWL-array it says so with a restriction on a restriction:

```turtle
PREFIX fhir: <http://hl7.org/fhir/>
PREFIX owl:  <http://www.w3.org/2002/07/owl#>
PREFIX ra:   <https://rdf-array.github.io/rdf-array/vocab#>

fhir:CodeableConcept rdfs:subClassOf
  [ a owl:Restriction ; owl:onProperty fhir:coding ;
    owl:allValuesFrom [ a owl:Restriction ; owl:onProperty ra:member ; owl:allValuesFrom fhir:Coding ] ] .

ex:cc fhir:coding ( [ fhir:system [ fhir:v "http://loinc.org"^^xsd:anyURI ] ; fhir:code [ fhir:v "8480-6" ] ] ) .
```

In Manchester syntax, `fhir:coding only (ra:member only fhir:Coding)`. No construct in that axiom
is new: the OWL API, Protégé's expression editor and every OWL 2 DL reasoner accept it today,
treating `ra:member` as an ordinary object property. What is new is the meaning of `ra:member`,
and of the `( … )` term in the data it constrains; from the two, a reasoner concludes that the
blank node inside the list is a `fhir:Coding`. A worked example, the SWAT4LS 2016 FHIR reasoning
process over today's FHIR RDF, is [examples/fhir](../examples/fhir/index.html); [OWL-array in
Protégé](protege-array.html) is a demo of it in Protégé.

## 1. Why

OWL 2 DL reserves `rdf:List`, `rdf:first`, `rdf:rest` and `rdf:nil` for its own syntax. An ontology
document whose data holds an RDF list leaves `rdf:first` triples [unconsumed](https://www.w3.org/TR/owl2-mapping-to-rdf/#Parsing_of_Axioms) and is not OWL 2 DL
(the mapping removes each triple a pattern matches, and the graph MUST be empty at the end),
so BIBO's `bibo:authorList` and SKOS's `skos:memberList` push their users into OWL Full, and no DL
class expression can look into a list at all. The workaround, since
[Drummond et al. 2006](https://research.manchester.ac.uk/en/publications/putting-owl-in-order-patterns-for-sequences-in-owl/),
has been to rebuild the ladder out of individuals under new names (a cell class, functional
"contents" and "next" properties, a transitive "followed by"), as OWL-S's `ObjectList` and the
[Collections Ontology](https://www.semantic-web-journal.net/content/collections-ontology-creating-and-handling-collections-owl-2-dl-frameworks)
did. Its limits are well documented: the structure is open (nothing says a cell has no other
successor), a fixed length cannot be stated without nesting one restriction per element, the
"last" element needs a transitive property that no cardinality may use, and classification of
450-element lists took minutes. Every one of those limits comes from deriving a list's structure
from triples. rdf-array makes the list a term; OWL-array gives the term a meaning.

| Use case | Data | What an OWL-array ontology can say |
|---|---|---|
| Bibliographic author order (`bibo:authorList`) | `ex:p bibo:authorList ( ex:ada ex:alan ex:grace )` | every author is a `foaf:Agent`; the first author has an affiliation; a paper has at least three authors |
| SKOS ordered collections (`skos:memberList`) | `ex:c skos:memberList ( ex:low ex:mid ex:high )` | every member is a `skos:Concept`; the list is not empty |
| Steps of a protocol, recipe or workflow | `ex:recipe ex:steps ( ex:chop ex:fry ex:serve )` | every step is a `Step`; the last step is a `Serving`; the first step needs no input |
| Geometry and measurements | `ex:ring ex:points ( ( 0 0 ) ( 0 1 ) ( 1 1 ) ( 0 0 ) )` | a ring has at least four points; each point is a pair of decimals |
| FHIR RDF (R5 writes repeated elements as lists) | `ex:cc fhir:coding ( [ fhir:system … ] )` | every coding is a `fhir:Coding` with a system and a code |
| Tuples and n-ary values | `ex:alice ex:salaryHistory ( ( 2019 50000 ) ( 2020 52000 ) )` | every entry is a pair; the pairs' members are numbers |
| Colours and other fixed-length values | `ex:red ex:rgb ( 255 0 0 )` | an `ex:rgb` value has three integer members; the class of things whose colour is `( 255 0 0 )` |

## 2. Lists in OWL's syntax

Everywhere the RDF mapping of OWL 2 reads a list, OWL-array reads a sequence term:

| Vocabulary | In Turtle-array |
|---|---|
| `owl:unionOf`, `owl:intersectionOf` (classes and data ranges) | `[ owl:unionOf ( ex:Cat ex:Dog ) ]` |
| `owl:oneOf` (individuals, or literals in a data range) | `[ owl:oneOf ( ex:red ex:green ) ]`, `[ owl:oneOf ( "a" "b" ) ]` |
| `owl:members`, `owl:distinctMembers` (AllDisjointClasses, AllDisjointProperties, AllDifferent) | `[ a owl:AllDifferent ; owl:members ( ex:a ex:b ex:c ) ]` |
| `owl:propertyChainAxiom` | `ex:uncle owl:propertyChainAxiom ( ex:parent ex:brother )` |
| `owl:hasKey` | `ex:Person owl:hasKey ( ex:ssn )` |
| `owl:disjointUnionOf` | `ex:Animal owl:disjointUnionOf ( ex:Cat ex:Dog )` |
| `owl:withRestrictions` | `[ owl:onDatatype xsd:integer ; owl:withRestrictions ( [ xsd:minInclusive 0 ] ) ]` |
| `owl:onProperties` (n-ary data ranges, not in OWL 2 DL) | `[ owl:onProperties ( ex:x ex:y ) ]` |
| `ra:tupleOf` (§3.2, new in OWL-array) | `[ ra:tupleOf ( 255 xsd:integer ex:Zero ) ]` |
| SWRL `swrl:body`, `swrl:head`, `swrl:arguments` | `[ a swrl:Imp ; swrl:body ( … ) ; swrl:head ( … ) ]` |

Written in Turtle-array these are sequences already, so an OWL ontology written in Turtle reads
unchanged. As in SHACL-array, three consequences follow:

- **A ladder is not a list.** An ontology document that spells a list as `rdf:first`/`rdf:rest`
  triples (N-Triples written by an RDF 1.1 tool, say) leaves those triples [unconsumed](https://www.w3.org/TR/owl2-mapping-to-rdf/#Parsing_of_Axioms), exactly as a
  list in the data did before: the document is not OWL 2 DL and a parser reports the triples.
  Convert it first.
- **`()` is the empty list; `rdf:nil` is not.** A SWRL rule with no body writes `swrl:body ()`.
  `owl:unionOf ()` is as ill-formed as it was.
- **Lists hold no blank-node structure.** `owl:unionOf ( [ a owl:Restriction ; … ] )` is a sequence
  holding a blank node whose own triples are ordinary triples of the document.

What a processor writes follows: the RDF renderers spell every OWL list as `( … )` in Turtle and
as `rdf:parseType="Collection"` in RDF/XML, and never as a ladder. The Functional-style, OWL/XML and
Manchester syntaxes have no RDF lists and are unchanged by this part.

## 3. Sequences in the data

### 3.1 Semantics

The direct semantics changes in one place; [owl-direct-semantics-array.html](owl-direct-semantics-array.html)
marks the changes as insertions and deletions in the OWL 2 Direct Semantics' own text, which it fetches
from w3.org when opened. The object domain of an interpretation contains, beside
the ordinary individuals, *sequences*: individuals each of which has a length n and an element at
each position 1 … n, an element being an individual, a data value or a sequence. Each occurrence of
a sequence term `( t1 … tn )` in an ontology denotes some sequence of length n whose i-th element is
`ti^I`; an occurrence of `()` denotes some sequence of length 0. Consequently:

- **An occurrence is an anonymous individual whose structure is fixed.** Two occurrences of
  `( 1 2 )`, in one document or in two, may denote one sequence or two, and nothing in OWL-array
  says which, just as nothing says whether two blank nodes with the same description denote one
  thing. This is the rdf-array data model, in which each written `( … )` is a term of its own
  ([rdf-array.md](rdf-array.html)), and it agrees with RDF simple entailment, under which
  `:s :p (1 2), (1 2)` and `:s :p (1 2)` entail each other.
- **Elements tell sequences apart.** Sequences of different lengths, or with different elements at
  some position, are different: occurrences of `( 1 2 )` and `( 1 3 )` denote different individuals
  in every interpretation, and occurrences of `( ex:a )` and `( ex:b )` do whenever
  `ex:a owl:differentFrom ex:b`.
- **Elements do not make sequences the same.** Equal elements are necessary for two occurrences to
  denote one sequence, not sufficient. An ontology that wants identity by elements needs a construct
  for it that OWL 2 keys cannot supply ([§10.1](#the-designs), B+K); [§10](#identity-the-alternatives) gives the design this replaces and
  the entailments each gives.
- **Sequences are a sort of their own.** No IRI, blank node or literal denotes a tuple, so a
  sequence is never `owl:sameAs` an IRI-named individual, as a literal is not, and `ra:Sequence` is
  disjoint from every class of ordinary individuals.
- **A sequence is closed.** Its members are exactly its elements, in order; there is nothing more
  to learn about them from other triples.

Where a sequence may stand in an ontology: wherever OWL 2 DL lets an anonymous individual stand. It
may be the object of a property assertion, the individual of a class assertion, an element of
another sequence, and an annotation value. OWL 2's
[restrictions on anonymous individuals](https://www.w3.org/TR/owl2-syntax/#The_Restrictions_on_the_Axiom_Closure)
keep it out of `owl:hasValue`, `owl:oneOf`, `owl:sameAs`, `owl:differentFrom` and negative property
assertions, where an individual that no other axiom can name would say nothing useful. A class
expression about a particular sequence uses `ra:tupleOf` instead: `ex:rgb some ra:tupleOf ( 255 0 0 )`
where an earlier draft wrote `ex:rgb value ( 255 0 0 )`. The link between a sequence and its
elements is not an `ObjectPropertyAssertion`, so it does not count toward the forest condition on
anonymous individuals in those restrictions.
In RDF a sequence may only be an object, so an axiom that would need one as a subject has no RDF form
and reaches an ontology only through the Functional-style, OWL/XML or Manchester syntax.
A sequence is never a class, a property, a datatype or an ontology IRI. The RDF-based semantics
(OWL 2 Full) is not addressed here.

### 3.2 The vocabulary

The `ra:` namespace, `https://rdf-array.github.io/rdf-array/vocab#`, holds the built-in entities of
OWL-array. Like `owl:Thing` and `owl:topObjectProperty`, each has an extension the semantics fixes
in every interpretation. An ontology uses them in class expressions and property axioms; it does
not define them, and an axiom *about* one of them (a range on `ra:member`, say) constrains every
sequence in the world, as an axiom about `owl:topObjectProperty` would.

| Term | Kind | In every interpretation, for a sequence `s` |
|---|---|---|
| `ra:Sequence` | class | the sequences, and nothing else |
| `ra:member` | object property | `s ra:member e` for each element `e` of `s` that is an individual or a sequence |
| `ra:memberValue` | data property | `s ra:memberValue v` for each element `v` of `s` that is a literal |
| `ra:length` | functional data property | `s ra:length n`, `n` the number of elements of `s`, an `xsd:nonNegativeInteger` |
| `ra:first`, `ra:last` | functional object properties | the first and the last element of `s`, when it is an individual or a sequence |
| `ra:firstValue`, `ra:lastValue` | functional data properties | the first and the last element of `s`, when it is a literal |
| `ra:tupleOf ( c1 … cn )` | class expression | the sequences `s` of length n whose i-th element is in `ci`, where `ci` is a class expression, a data range, an individual (that individual) or a literal (that value) |

`ra:tupleOf` is the one new constructor. Its positions are exact, since a sequence is closed:
`ra:tupleOf ( 255 0 0 )` holds `( 255 0 0 )` and not `( 255 0 0 7 )`. In RDF, an IRI element of its
list is a class when the imports closure declares it `owl:Class`, a datatype when it declares it
`rdfs:Datatype`, and an individual otherwise, the way the RDF mapping of OWL 2 already uses
declarations to tell entities apart. A literal element is that value, and a blank node element is
a class expression or data range given by its own triples.

`ra:first ⊑ ra:member`, `ra:last ⊑ ra:member`, `ra:firstValue ⊑ ra:memberValue` and
`ra:lastValue ⊑ ra:memberValue` hold by construction; so does `∃ra:member.⊤ ⊑ ra:Sequence` and the
like for every property above. Three classes are definable and are defined, with the declarations
and these axioms, in the vocabulary ontology [vocab/owl-array.ttl](../vocab/owl-array.ttl), which an
ontology may import so that an editor knows the entities:

| Class | Definition |
|---|---|
| `ra:EmptySequence` | `ra:Sequence and ra:length value 0`, the class of `()` |
| `ra:ObjectSequence` | `ra:Sequence and not (ra:memberValue some rdfs:Literal)`: no literal members |
| `ra:DataSequence` | `ra:Sequence and not (ra:member some owl:Thing)`: no individual members |

The vocabulary ontology is plain OWL 2 DL and says the same thing read as RDF 1.1 or as rdf-array.
Importing it is a convenience, not a requirement: the meaning of the built-ins does not come from
its axioms.

### 3.3 What an ontology can say

The use cases of §1, in Manchester syntax, with the Turtle-array of the first:

```
Class: ex:Paper
  SubClassOf: bibo:authorList only (ra:member only foaf:Agent)        # every author is an agent
  SubClassOf: bibo:authorList only (ra:first some (foaf:Person and ex:affiliation some ex:Org))
Class: ex:BigPaper
  EquivalentTo: ex:Paper and bibo:authorList some (ra:length some xsd:integer[>= 3])
Class: skos:OrderedCollection
  SubClassOf: skos:memberList only (ra:member only skos:Concept)
  SubClassOf: skos:memberList only (not ra:EmptySequence)
Class: ex:Recipe
  SubClassOf: ex:steps only (ra:member only ex:Step), ex:steps only (ra:last some ex:Serving)
Class: ex:Ring
  SubClassOf: ex:points only (ra:length some xsd:integer[>= 4]
                              and ra:member only (ra:length value 2 and ra:memberValue only xsd:decimal))
Class: ex:Swatch
  SubClassOf: ex:rgb only (ra:length value 3 and ra:memberValue only xsd:integer[>= 0, <= 255])
Class: ex:RedThing
  EquivalentTo: ex:rgb some ra:tupleOf ( 255 0 0 )                     # the sequences ( 255 0 0 )
Class: ex:Point
  EquivalentTo: ra:tupleOf ( xsd:decimal xsd:decimal )                 # a pair of decimals
Class: ex:AdaFirst
  EquivalentTo: bibo:authorList some ra:tupleOf ( { ex:ada } foaf:Agent foaf:Agent )
ObjectProperty: dc:creator
  SubPropertyChain: bibo:authorList o ra:member                        # flattens the list by axiom
ObjectProperty: ex:firstAuthor
  SubPropertyChain: bibo:authorList o ra:first
```

```turtle
PREFIX bibo: <http://purl.org/ontology/bibo/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ra:   <https://rdf-array.github.io/rdf-array/vocab#>

ex:Paper rdfs:subClassOf
  [ a owl:Restriction ; owl:onProperty bibo:authorList ;
    owl:allValuesFrom [ a owl:Restriction ; owl:onProperty ra:member ; owl:allValuesFrom foaf:Agent ] ] .

ex:p a ex:Paper ; bibo:authorList ( ex:ada ex:alan ex:grace ) .
```

The two quantifiers stay separate: `bibo:authorList only (ra:member only C)` says every author of
every author list is a `C`; `bibo:authorList some (ra:member some C)` says some list has some `C`;
`bibo:authorList only (ra:member some C)` says every list has one. A property chain through
`ra:member` or `ra:first` gives an existing vocabulary a view of the list: with the chain above,
`ex:p dc:creator ex:ada` is entailed, and every class expression ever written over `dc:creator`
applies to list members. Such a chain makes its super-property non-simple, so `dc:creator` can no
longer appear in a cardinality restriction; that is OWL 2's usual rule.

### 3.4 Entailments

From the ontology above, a reasoner that implements OWL-array (§6) concludes:

- `ex:ada a foaf:Agent`, `ex:alan a foaf:Agent`, `ex:grace a foaf:Agent`;
- `ex:p a ex:BigPaper`, since `( ex:ada ex:alan ex:grace ) ra:length 3`;
- `ex:p dc:creator ex:ada`, `ex:p ex:firstAuthor ex:ada`;
- `( ex:ada ex:alan ex:grace ) a ra:Sequence`, `ra:ObjectSequence`, and `not ra:EmptySequence`;
- `ex:p a ex:AdaFirst`, and, if `ex:ada owl:sameAs ex:adaL`, `ex:p a (bibo:authorList some
  ra:tupleOf ( { ex:adaL } ex:alan ex:grace ))`;
- `ex:ring a ex:Ring` with three points is inconsistent, and `ex:red ex:rgb ( 255 0 )` with
  `ex:red a ex:Swatch` is inconsistent;
- `ex:x ex:rgb ( 255 0 0 )` entails `ex:x a ex:RedThing`, whichever document each comes from;
- `ex:x ex:rgb ( 255 0 0 ) . ex:y ex:rgb ( 0 0 255 )` entails that the two sequences are different
  individuals; `ex:x ex:rgb ( 255 0 0 ) . ex:y ex:rgb ( 255 0 0 )` entails neither that they are
  the same nor that they are different.

Nothing follows about the members of a list from the list alone: `( ex:ada ex:alan )` says that
`ex:ada` is a member of it and nothing more, as a triple says nothing more than itself.

### 3.5 Counting, and literal members

Two consequences of OWL 2's semantics are worth knowing before writing cardinalities:

- **`ra:member` counts distinct individuals, not positions.** `( ex:a ex:a ex:a )` has one member,
  and `( ex:a ex:b ex:c )` has three only in interpretations where the three are different, which
  OWL does not assume. "At least three authors" is `ra:length some xsd:integer[>= 3]`, which is
  crisp; "three different authors" adds `ra:member min 3 foaf:Person` to it. The same holds for
  `ra:memberValue` and repeated literals.
- **`ra:member only C` says nothing about literal members.** It is vacuously true of `( 1 2 3 )`.
  To require that every element is an individual in `C`, write `ra:ObjectSequence and ra:member
  only C`; for literals, `ra:DataSequence and ra:memberValue only D`.

### 3.6 Profiles

OWL 2 EL has no `only`, so an EL ontology constrains members through a property chain and a range:
`bibo:authorList o ra:member SubPropertyOf: ex:author`, `ex:author Range: foaf:Agent`. OWL 2 RL
keeps `only` over members in superclass position, which is where the examples above use it, and
has no datatype facets, so length bounds are outside RL. `ra:tupleOf` expands to an intersection
of `some` and `value` restrictions (§6), which EL allows anywhere and RL allows on the left of
`SubClassOf`; telling two sequences apart by their elements needs the expansion's functional
position properties, which EL has only for data. The vocabulary ontology uses functional
object properties, complements and unions, which EL and QL lack; an EL or QL ontology relies on the
built-in meaning without importing it.

## 4. Writing a sequence in each OWL syntax

| Syntax | A sequence | Notes |
|---|---|---|
| Turtle-array, TriG-array, N-Triples-array | `( ex:a "x" ( 1 2 ) )`, `()` | as rdf-array.md |
| RDF/XML | `<ex:p rdf:parseType="Collection">…</ex:p>` | one term, `()` when empty; a literal element needs a nested description, so RDF/XML cannot write every sequence |
| Functional-style syntax | `Sequence( ex:a "x"^^xsd:string Sequence( "1"^^xsd:integer "2"^^xsd:integer ) )`, `Sequence( )` | a new production under `Individual` |
| OWL/XML | `<Sequence> <NamedIndividual IRI="…"/> <Literal>…</Literal> <Sequence/> </Sequence>` | likewise |
| Manchester syntax | `( ex:a "x" ( 1 2 ) )`, `( )` | in the positions of an anonymous individual: `Facts:`, `Individual:` |

`ra:tupleOf` is spelled `[ ra:tupleOf ( … ) ]` in RDF and, as proposed, `ra:tupleOf ( … )` in
Manchester syntax and `ObjectTupleOf( … )` in the Functional-style syntax and OWL/XML; no
implementation reads it yet.

Until a syntax's grammar is taught the spelling, an implementation may round-trip a sequence as an
anonymous individual whose node ID encodes the sequence reversibly, so that the same document read
back gives the same term; owlapi-array does so for the Functional-style, OWL/XML and Manchester
syntaxes in its first cut, and labels such a node ID `_:seq…`. A sequence never has an IRI.

## 5. What OWL-array does not add

- **No ladder reading.** `rdf:first`/`rdf:rest` triples are triples in OWL's syntax and in the data,
  and leave an ontology outside OWL 2 DL as they always did. OWL-array does not fold them.
- **No `ra:rest`.** A property to the sequence of the remaining elements would rebuild the ladder
  as individuals, with every limit of §1: it is left out on purpose. `ra:first` and `ra:last` cover
  the positions ontologies ask for; the remaining ones are reached, for now, by SPARQL-array's
  position patterns rather than by class expressions.
- **No content model.** `ra:tupleOf` fixes the length; a regular content model over members
  (`( Person+ Org? )`) is the natural next layer, as it is for SHACL-array and ShEx-array.
- **No positional properties in the vocabulary.** The expansion (§6) has a property per position;
  they stay out of `ra:`, for the reasons of [§10.3](#trade-offs).
- **No datatype reading.** A literal-only sequence is still an individual with `ra:memberValue`s,
  not a value of a sequence datatype. OWL 2 DL keeps individuals and data values apart, and a
  datatype could never say "every author is a Person"; one reading is simpler than two.
- **No counting by position** through `ra:member` (§3.5), and no uniqueness constraint: SHACL 1.2's
  `sh:uniqueMembers` has no OWL-array counterpart, since OWL cannot say that two positions differ.
- **No identity by elements**, unless an ontology states it (§3.1, [§10](#identity-the-alternatives)).
  A sequence has no IRI and no label; an editor displays it by its spelling.

## 6. Reasoning with a reasoner that does not know sequences

The semantics of §3 is normative; how a reasoner meets it is not. The first implementations give
an existing OWL 2 DL reasoner (HermiT, JFact, ELK for EL) the meaning of the built-ins by
*expansion*: a decorator around the reasoner rewrites the ontology it sees, and nothing is added to
the ontology the user edits or saves. For each occurrence `s` of a sequence term in the imports
closure, with elements `e1 … en`:

- `s` becomes a fresh named individual. Naming an anonymous individual (Skolemising it) keeps every
  entailment that does not mention the new name, and the decorator maps results back to the
  occurrence, so no name leaves the expansion. Since the name does not depend on the elements, an
  occurrence holding a blank node is named like any other. Whether the blank nodes inside should be
  named the same way, so that `ra:member` can be closed with a `ObjectOneOf` of them, is
  [rdf-array#20](https://github.com/rdf-array/rdf-array/issues/20); FHIR RDF, in which every element
  is a blank node, is the case that decides it.
- `ClassAssertion( ra:Sequence s )` and `DataPropertyAssertion( ra:length s n )`.
- **Positions:** `ObjectPropertyAssertion( o_i s ei )` for an individual or sequence element and
  `DataPropertyAssertion( d_i s vi )` for a literal, where `o_i` and `d_i` are functional properties
  with domain `ra:Sequence`, private to the expansion; and
  `ClassAssertion( ObjectMaxCardinality( 0 o_n+1 ) s )` with its data counterpart, so that nothing
  follows position n.
- `ObjectPropertyAssertion( ra:member s ei )` for each individual element and
  `DataPropertyAssertion( ra:memberValue s vi )` for each literal element, with `ra:first`,
  `ra:last`, `ra:firstValue` and `ra:lastValue` for the ends.
- **Closure:** `ClassAssertion( ra:member only { the individual elements } s )`, or
  `ra:member max 0` when there are none, and the same for `ra:memberValue` with a `DataOneOf`.
  Closure is what makes `ra:member only C` decidable on `s` and what no ladder could supply; it
  is omitted for an EL reasoner, which cannot express it and cannot ask the questions that need it.
- Nested sequences are expanded recursively, each occurrence to its own individual.
- **`ra:tupleOf ( c1 … cn )`** becomes `ra:Sequence and ra:length value n` intersected, for each i,
  with `o_i value a` (an individual `a`), `o_i some C` (a class expression, or a nested
  `ra:tupleOf`), `d_i value v` (a literal) or `d_i some D` (a data range). This is the *structural*
  expansion.
- **Hybrid expansion of ground tuples.** A reasoner pays heavily for structural `ra:tupleOf`
  classes ([§10.4](#results)). For each `ra:tupleOf` whose elements are all individuals and literals,
  the expansion therefore makes a named class `T`, adds `T SubClassOf` its structural expansion, puts
  `T` where the `ra:tupleOf` was, and asserts `ClassAssertion( T s )` for each occurrence `s` whose
  elements are those individuals and values, comparing literals by value. This is sound. It is
  complete when the elements are literals, whose identity the expansion can decide. With individual
  elements it misses an occurrence whose elements are only entailed to be the tuple's (through
  `owl:sameAs` or a functional property); a query written with the structural form still finds it.

The expansion is linear in the number of elements, complete for the sequences spelled in the
ontology (with the hybrid's exception above), and sound for the rest: of a sequence that a class expression merely asserts to exist, a
reasoner knows what the vocabulary ontology's axioms say. The vocabulary ontology is added to the
closure the reasoner sees. Reasoner results that mention expansion individuals are mapped back to
sequence terms on the way out.

## 7. Tests

- **owlapi-array's own tests**, from the OWL API's `contract` module: every round-trip test whose
  RDF spells a list reads it as a sequence, and a test that depended on a ladder is flagged with the
  reason, never dropped, as the `array-tests` skill prescribes.
- **New tests**, in the fork: parsing `( … )` nested, empty and holding a blank node property list, in
  Turtle and RDF/XML; equality of sequence terms by elements; rendering and round trips through every
  syntax, with the node-ID stopgap where a grammar lacks the spelling; §2's lists as sequences;
  the examples of §3.3 checked against a DL reasoner through the expansion of §6, as entailments and
  as inconsistencies; the two caveats of §3.5 as tests that the naive reading does not hold.
- **The FHIR example**, [examples/fhir](../examples/fhir/index.html): the SWAT4LS 2016 FHIR reasoning
  process over today's FHIR RDF, 24 DL queries with their expected answers and one inconsistency, run
  through owlapi-array and HermiT by its `FhirReasoning.java`; to become a test in the fork.
- **The identity experiments** of [§10.4](#results), in
  [examples/owl-identity](https://github.com/rdf-array/rdf-array/tree/rdf-sequences/examples/owl-identity): the RedThing case under OWL 2 with the OWL API,
  HermiT and Jena, and the per-occurrence expansion with `ra:tupleOf` checked case by case and timed;
  to become tests in owlapi-array when it implements this revision.
- **owl-tests-contrib**, if a second implementation follows: the same cases in a manifest, with a
  requirement term `ra:OwlArray` added to the test vocabulary with it.

## 8. Implementations

| Implementation | OWL's lists as sequences | Data sequences | Reasoning | Status |
|---|---|---|---|---|
| [owlapi-array](https://github.com/rdf-array/owlapi-array) (OWL API 4.5.29) | Turtle and RDF/XML parsers and renderers; RDF/XML refuses a sequence holding a literal ([#18](https://github.com/rdf-array/rdf-array/issues/18)); the Rio formats still use ladders ([#19](https://github.com/rdf-array/rdf-array/issues/19)); Functional-style, OWL/XML and Manchester carry a sequence as a `_:seq_…` node ID | an `OWLSequence` individual, equal by elements | the expansion of §6 as `SequenceAwareReasonerFactory`, tested with HermiT 1.4.5; no closure when a sequence holds an anonymous individual ([#20](https://github.com/rdf-array/rdf-array/issues/20)) | the term, parsers, renderers and decorator done 2026-10-26; the FHIR example a test, blank nodes inside sequences written inside them, 2026-10-27: 4703 tests, 0 failures, 316 flagged; see its `doc/rdf-array.md` |
| Protégé 5.6.9 against owlapi-array | its `bundles/owlapi-osgidistribution.jar` replaced by owlapi-array's, same symbolic name and version; no editor change | displayed by node ID, `_:seq_…`, until the Manchester renderer learns `( … )`; never a DL Query answer ([#21](https://github.com/rdf-array/rdf-array/issues/21)) | "HermiT 1.4.3 (OWL-array)" and "ELK 0.6.0 (OWL-array)" in the reasoner menu, from [protege-owl-array](https://github.com/rdf-array/protege-owl-array); ELK skips the blank nodes that hold FHIR data | done 2026-10-27: [examples/fhir](../examples/fhir/index.html) §4, the 24 DL queries answered in the DL Query tab as through the OWL API |

Both implement the reading this revision drops (design A of [§10](#identity-the-alternatives)): one
individual per distinct ground sequence, and `owl:hasValue` with a sequence. Neither yet has
`ra:tupleOf` or one individual per occurrence.

## 9. Decisions and precedent

- **An individual, not a data value, and not syntax only.** The datatype alternative (§5) could not
  reach IRI or blank-node members; leaving data sequences unread would have left the motivating
  cases out. The individual reading is the only one that lets a class expression say "every author
  is a Person".
- **Built-in properties, not a new restriction kind.** `owl:onPropertyMembers`, a restriction whose
  `allValuesFrom` applied to the members of a property's values, was considered. It fuses two
  quantifiers (every value, every member) and would need new class expressions in every syntax,
  parser, renderer and reasoner interface. Nesting an ordinary restriction on `ra:member` needs none
  of that, composes with property chains, and matches SHACL 1.2's `sh:memberShape` plus
  `sh:minListLength`, ShEx-array's `((S))[m, n]`, JSON Schema's `items` plus `minItems`, and the
  array types of property-graph schemas (Neo4j's `LIST<INTEGER NOT NULL>` constraints, PG-Schema's
  `STRING ARRAY {1,2}`): a constraint on members and bounds on length.
- **No IRI, and no identity by elements.** The first draft named each sequence with a reversible
  URN and an `rdfs:label`, which made `( ex:a )` and `( ex:b )` different individuals even when
  `ex:a owl:sameAs ex:b`. The second (2026-10-26 to 2026-11-05) made a sequence denote the tuple of
  its elements, so that equal sequences were one individual everywhere. The rdf-array data model
  then made each written `( … )` a term of its own (2026-11-03), and that reading made OWL entail
  more than the data model: `:N1 :p (1 2) . :N2 :p (1 2)` entailed that N1 and N2 have a common
  `:p` value. This revision gives up identity by elements, keeps every OWL 2 inference, and gets
  `RedThing` back with `ra:tupleOf`. [§10](#identity-the-alternatives) has the alternatives and the
  evidence.
- **No companion ontology.** The same draft materialised the `ra:` assertions into an ontology
  imported beside the source. The length of `( 1 2 3 )` is a fact about the term, as the value of
  `"3"^^xsd:integer` is; it is computed where it is needed, not stored.
- **No `ra:rest`**, for the reasons of §5.
- Precedent for description logic over sequences is thin and all of it builds proxies:
  [Drummond et al.](https://research.manchester.ac.uk/en/publications/putting-owl-in-order-patterns-for-sequences-in-owl/)
  (2006), who also showed regular-expression-like matching over classes of lists by nesting;
  the [Collections Ontology](https://www.semantic-web-journal.net/content/collections-ontology-creating-and-handling-collections-owl-2-dl-frameworks)
  with indexed `co:ListItem`s; the ontology design patterns' Sequence pattern. The theory that
  bears on OWL-array is Baader and Sattler's on
  [aggregates](https://iccl.inf.tu-dresden.de/web/LATPub267) (a built-in `ra:length` on a closed
  term avoids the undecidability of counting over open chains), Lutz, Areces, Horrocks and
  Sattler's on [keys](https://jair.org/index.php/jair/article/view/10412) (identity by elements,
  where an ontology wants it, is a key on positions, decidable over named individuals), and temporal description logics over
  [finite traces](https://bia.unibz.it/esploro/outputs/conferenceProceeding/Temporal-description-logics-over-finite-traces/991005772379101241)
  for the content-model layer to come. Property graphs have arrays only of primitive values and
  constrain them by element type and count; none lets an array hold a node, which is the case
  that matters here.

## 10. Identity: the alternatives

When do two sequences denote one individual? The answer decides what follows from data that two
documents wrote separately. It also decides whether OWL-array entails more than the rdf-array data
model it sits on, and what a reasoner pays. This section sets out the designs considered, the
entailments on which they differ, and the experiments behind §3.1's choice.

### 10.1 The designs

- **O. OWL 2 as it is.** A list in the data is an RDF 1.1 list: a blank node with `rdf:first` and
  `rdf:rest` triples. The baseline: what an ontology gets today.
- **A. Identity by elements** (OWL-array from 2026-10-26 to 2026-11-05). A sequence term denotes the
  tuple of its elements' denotations, so equal sequences are one individual in every document, as a
  literal denotes one value. A sequence may be a nominal: `ex:rgb value ( 255 0 0 )`. The expansion
  gives each distinct ground sequence one named individual.
- **B. One individual per occurrence** (this document, §3.1). Each occurrence denotes some sequence
  with its elements; equal elements do not make two the same. `ra:tupleOf` replaces the nominal.
  The expansion is structural or hybrid (§6).
- **B+K. B with identity on request.** An ontology that wants identity by elements asks for it.
  An OWL 2 key cannot do this: keys bind only individuals in NAMED, and a sequence is never named
  ([owl-direct-semantics-array.html](owl-direct-semantics-array.html), the note at §2.3.5). The experiment in §10.4 got the identity
  from `HasKey( ra:Sequence ( o_1 … ) ( ra:length d_1 … ) )` only because the expansion names every
  occurrence, which the semantics does not. So B+K needs a built-in of its own, one that equates
  sequences with the same length and elements, at least when those elements are named.
- **D. A datatype.** A sequence of literals is a data value of a sequence datatype, equal by value
  for free. It cannot hold an individual, so "every author is a Person" is out of reach; §9 rejects it.
- **E. Positional properties in the vocabulary.** B, with the expansion's position properties made
  public (`ra:o_1`, `ra:d_1`, …, after RDF's `rdf:_1`, `rdf:_2`, …), so that an ontology writes tuple
  classes and keys itself instead of `ra:tupleOf`. Its entailments are those of B, or of B+K with a key.

### 10.2 Differential entailments

Each row is a premise set and a conclusion; each cell says whether the design entails it. In
column O the sequence is an RDF 1.1 list. In column B the premise's `ex:rgb value ( 255 0 0 )` is
written `ex:rgb some ra:tupleOf ( 255 0 0 )`. The test numbers in brackets are §10.4's.

| # | Premises | Conclusion | O | A | B | B+K | D |
|---|---|---|---|---|---|---|---|
| 1 | `RedThing ≡ ex:rgb value ( 255 0 0 )` in one document; `ex:x ex:rgb ( 255 0 0 )` in another | `ex:x a RedThing` | no [R1–R3] | yes | yes [T1] | yes | yes |
| 2 | `:N1 :p (1 2) . :N2 :p (1 2)` | the two sequences are one individual (N1 and N2 have a common `:p` value) | no | yes | no [T3] | yes [T4] | yes |
| 3 | `:code` inverse functional (for D, `HasKey( owl:Thing () ( :code ) )`); `:a :code (1 2) . :b :code (1 2)` | `:a owl:sameAs :b` | no | yes | no [T4] | yes [T4] | yes |
| 4 | `:p :authorList ( :ada :alan :grace ) . :ada owl:sameAs :adaL` | `:p a (:authorList some ra:tupleOf ( {:adaL} :alan :grace ))` (in A, `:p :authorList ( :adaL :alan :grace )`) | no | yes | yes [T2], and with the hybrid expansion only through a structural query [T8] | yes | n/a |
| 5 | `:s :p (1 2) . :t :p (1 3)` | the two sequences are different | no | yes | yes [T3] | yes | yes |
| 6 | `Swatch ⊑ ex:rgb only (ra:length value 3)`; `:red a Swatch ; ex:rgb (255 0)` | inconsistent | no | yes | yes [T6] | yes | yes |
| 7 | `:s :p (1 2), (1 2)` | `:s a (:p min 2 owl:Thing)` | no | no | no | no | no |
| 8 | `:s :p (1 2)` | `:s :p (1 2), (1 2)` (read as two occurrences) | yes | yes | yes | yes | yes |

Rows 2 and 3 are where the designs part. A, B+K and D say that equal sequences are one thing. O and B
say that they may be, and RDF says the same of two blank nodes with one description. Rows 7 and 8
hold in every design: no design counts occurrences, which matches RDF simple entailment and makes a
repeated occurrence redundant, not meaningful. Row 1 is the case that seemed to need A. It does not
hold in OWL 2 today (§10.4.1), and B gets it back with `ra:tupleOf`.

What A entails beyond B is all of one kind: conclusions that equate sequences, or the things that
hold them, because their elements are equal. Under A, OWL-array entails `:N1 :p _:x . :N2 :p _:x`
from row 2's premises, which rdf-array's own data model, read as RDF, does not. SPARQL-array has the
same tension where `DISTINCT` and `GROUP BY` meet joins by occurrence
([rdf-array.md](rdf-array.html#distinct-and-group-by-under-joins-by-occurrence)).

### 10.3 Trade-offs

| Design | For | Against |
|---|---|---|
| O | nothing new | no list in the data is OWL 2 DL; no class expression can look into one; row 1 fails |
| A | a sequence works like a literal: a nominal, in `owl:sameAs`, in `owl:oneOf`; row 1 with the familiar `value` | entails more than the data model it reads (rows 2, 3); a sequence holding a blank node is anonymous and gets no identity anyway ([#20](https://github.com/rdf-array/rdf-array/issues/20)); identity through `owl:sameAs` of elements needs a key per length, never implemented |
| B | entails nothing the data model does not; treats a sequence as OWL 2 treats an anonymous individual; every occurrence can be named in the expansion whatever it holds; `ra:tupleOf` takes classes as well as values (`ra:tupleOf ( {ex:ada} foaf:Agent )`) | no sequence in `owl:hasValue`, `owl:oneOf`, `owl:sameAs`; one new class constructor for every syntax; structural `ra:tupleOf` is slow in HermiT and needs the hybrid expansion, which is incomplete under `owl:sameAs` of individual elements |
| B+K | identity where an ontology asks for it | needs a new built-in, since OWL 2 keys bind only named individuals and a sequence never is one; cost at scale not measured |
| D | identity and facets for free | no individual members; OWL 2 DL keeps data values and individuals apart |
| E | no new constructor, since `ra:tupleOf` becomes a macro; keys are written directly | an unbounded vocabulary split into object and data positions; invites ontologies to rebuild the ladder out of positions |

The recommendation, and §3.1, is B with the hybrid expansion. B+K stays open to any ontology that
asks for identity, once the key has a spelling (§10.5).

### 10.4 Results

All runs used the OWL API 4.5.29 and HermiT 1.4.3 as bundled in Protégé 5.6.9, and Apache Jena 4.8.0,
on Java 21. The sources are in [examples/owl-identity](https://github.com/rdf-array/rdf-array/tree/rdf-sequences/examples/owl-identity).

#### 10.4.1 OWL 2 today: the RedThing case (`Red.java`, `RedJ.java`)

`ex:RedThing owl:equivalentClass [ owl:onProperty ex:rgb ; owl:hasValue ( 255 0 0 ) ]` and
`ex:x ex:rgb ( 255 0 0 )`, read as Turtle 1.1, with a named individual `ex:red` in place of the
list as a control:

| # | Reading | `ex:x a ex:RedThing` |
|---|---|---|
| R1 | OWL API + HermiT, list, the two triples in two documents | not entailed |
| R2 | OWL API + HermiT, list, one document | not entailed |
| R3 | Jena OWL rules and OWL Micro rules, list, one graph | not entailed |
| R4 | all three, `ex:red` in place of the list | entailed |

The list's head is a blank node, so the restriction names an anonymous individual, which OWL 2 DL
forbids in `ObjectHasValue`
([OWL 2 Syntax §11.2](https://www.w3.org/TR/owl2-syntax/#The_Restrictions_on_the_Axiom_Closure)). The
OWL API takes it anyway: it drops the `rdf:first`/`rdf:rest` triples, reports no unparsed triples,
and its OWL 2 DL profile checker passes the ontology, a gap in the checker. Read that way, the two
lists are two anonymous individuals, even in one document, and nothing makes them one. The
RDF-Based Semantics has no extensionality for lists either, so OWL 2 Full does not equate them, and
Jena's rules agree. The named individual works because both axioms name the same thing. A literal
works for the same reason: it denotes its value in every interpretation, which is what design A gave
sequences.

#### 10.4.2 Design B checked case by case (`Tuple.java`)

The structural expansion of §6, with every result as wanted:

| # | Premises | Question | Result |
|---|---|---|---|
| T1 | `RedThing ≡ ex:rgb some ra:tupleOf ( 255 0 0 )`; `x rgb (255 0 0)`, `y rgb (0 0 255)`, `z rgb (255 0)` | x, y, z a RedThing? | x yes; y, z no |
| T1 | `rgbF` functional, `RedF ≡ rgbF some ra:tupleOf ( 255 0 0 )`; `w rgbF (0 0 255)` | `w a not RedF`? | yes |
| T1 | the occurrences of (255 0 0), (0 0 255) and (255 0) | different from each other? | yes, by element and by length |
| T2 | `paper authorList (ada alan grace)`, `ada sameAs adaL` | `paper a authorList some ra:tupleOf ({adaL} alan grace)`? | yes; with `alan` and `ada` swapped, no |
| T3 | `N1 p (1 2) . N2 p (1 2) . N3 p (1 3)` | the two (1 2) the same? different? | neither |
| T3 | | (1 2) and (1 3) different? | yes |
| T3 | | `N2 a (p value` N1's sequence`)`? | no |
| T4 | `code` inverse functional; `a code (1 2) . b code (1 2)` | `a sameAs b`? | no; with `HasKey( ra:Sequence () ( ra:length d_1 d_2 ) )`, yes |
| T5 | `FromOrigin ≡ pts some ra:tupleOf ( ra:tupleOf ( 0 0 ) ( ra:Sequence and ra:length value 2 ) )` | `seg pts ((0 0) (1 0))`, `seg2 pts ((1 1) (1 0))` in FromOrigin? | seg yes, seg2 no |
| T6 | `Swatch ⊑ rgb only (ra:length value 3)`; `red a Swatch ; rgb (255 0)` | inconsistent? | yes |
| T8 | hybrid: `ByAdaL ≡ authorList some T`, `T ⊑ ra:tupleOf ({adaL} alan grace)`; the occurrence of (ada alan grace) asserted into its own tuple class; `ada sameAs adaL` | `paper a ByAdaL`? | no: the hybrid's incompleteness |
| T8 | | `paper a authorList some ra:tupleOf ({adaL} alan grace)` (structural)? | yes |

#### 10.4.3 Reasoning cost

K classes `Ci ≡ ex:rgb some ra:tupleOf ( i i+1 i+2 )` and n individuals each with one `ex:rgb`
sequence drawn from those K. The measure is the time to retrieve the instances of all K classes
after a consistency check. "Structural, shared" gives one individual to all equal sequences, which
is design A's identity with B's classes. "Nominal" is a stand-in for design A's expansion, a named
individual per distinct sequence with `Ci ≡ ex:rgb value ci`, without the `ra:` assertions.

| Expansion | Design | Elements | K | n | Time |
|---|---|---|---|---|---|
| structural | B | literals | 11 | 5 | 12.8 s |
| structural | B | literals | 5 | 200 | 55 s |
| structural | B | literals | 20 | 20 | over 120 s, stopped |
| structural | B | individuals | 5 | 200 | 20.9 s |
| structural, shared | A's identity, B's classes | literals | 5 | 200 | 21 s |
| nominal | stand-in for A | named individuals | 20 | 5000 | 0.22 s (consistency 0.09 s) |
| hybrid | B | literals | 20 | 1000 | 0.06 s |
| hybrid | B | literals | 20 | 5000 | 0.14 s (consistency 0.44 s) |

Sharing an individual between equal sequences does not rescue the structural expansion, so its cost
comes from the `ra:tupleOf` classes, not from having one individual per occurrence. The hybrid
expansion makes B as fast as the nominal stand-in for A. Neither the key of B+K nor reasoners other
than HermiT were timed.

### 10.5 Open

- **How an ontology asks for identity.** It needs a built-in, since an OWL 2 key does not reach sequences.
  That could be one assertion (`ra:Sequence a ra:KeyedByElements`, say) whose semantics equates
  sequences with equal lengths and elements, and which the expansion turns into the key of T4.
  Design E's public positions would not be enough, for the same reason.
- **Completeness of the hybrid expansion** with individual elements: whether to fall back to the
  structural form for a tuple whose elements take part in `owl:sameAs`, functional properties or
  keys, and what that costs.
- **Other reasoners** (ELK, JFact, Pellet, Konclude), and the cost of B+K's key at scale.
- **OWL 2 Full.** The RDF-Based Semantics is not addressed (§3.1). Design B needs no
  extensionality condition there, where design A would have needed one.

[OWL 2 Direct Semantics]: https://www.w3.org/TR/owl2-direct-semantics/
[OWL 2 Mapping to RDF Graphs]: https://www.w3.org/TR/owl2-mapping-to-rdf/
