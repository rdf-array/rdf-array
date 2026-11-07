# OWL-array Direct Semantics: what changes from OWL 2

This document gives the model theory of [OWL-array](owl-array.html) as changes to the
[OWL 2 Direct Semantics], for a reader who knows that specification. It follows that document's
section numbers, and each heading links to the section it changes. Only changes to the
interpretations or to what is entailed are marked, in boxes. Unchanged text is not repeated, and a
section that is not mentioned is unchanged. The examples extend the running Griffin family examples
of the [OWL 2 Structural Specification] with one ordered list. *2026-11-06; the design and the
alternatives it was chosen from are in [owl-array.md](owl-array.html) §3 and §10.*

<style>
  .delta { border-left: 4px solid #b4530a; background: rgba(180, 83, 10, 0.07); padding: 0.4em 1em 0.6em; margin: 1em 0; }
  .delta::before { content: attr(data-kind) " change"; display: block; font: 600 0.75em/1.6 sans-serif; letter-spacing: 0.06em; text-transform: uppercase; color: #b4530a; }
  .delta p { margin: 0.4em 0; }
  .delta table { margin: 0.5em 0; }
  .ent { font-family: monospace; font-size: 0.92em; }
</style>

## 1. [Introduction](https://www.w3.org/TR/owl2-direct-semantics/#Introduction): the running example

Five axioms. Three come from the Structural Specification's examples, and two are new. One new
axiom holds a list, Peter's children from eldest to youngest. The other connects the list to
`a:fatherOf`, the property of the §9.6.2 example:

```manchester
SameIndividual( a:Meg a:Megan )                                   # Structural Spec. §9.6.1
DifferentIndividuals( a:Peter a:Meg a:Chris a:Stewie )            # §9.6.2
ClassAssertion( a:Boy a:Stewie )                                  # §9.1.3
ObjectPropertyAssertion( a:children a:Peter ( a:Meg a:Chris a:Stewie ) )        # new
SubObjectPropertyOf( ObjectPropertyChain( a:children ra:member ) a:fatherOf )   # new
```

Call this ontology *O<sub>G</sub>*. In Turtle-array the fourth axiom is
`a:Peter a:children ( a:Meg a:Chris a:Stewie ) .`. Read as RDF 1.1, its list is an
`rdf:first`/`rdf:rest` structure that OWL 2 DL does not admit in data, which is where OWL-array starts.

The syntax this assumes, from owl-array.md §4:

- A *sequence term* `( t1 … tn )`, `n ≥ 0`, is an `Individual`, and each `ti` is an individual (named,
  anonymous or another sequence term) or a literal.
- `ObjectTupleOf( u1 … un )` is a class expression, and each `ui` is a class expression, a data range,
  a named individual or a literal.
- Seven built-in entities have fixed meanings, as `owl:Thing` has: `ra:Sequence`, `ra:member`, `ra:first`, `ra:last`,
  `ra:memberValue`, `ra:length`, `ra:firstValue` and `ra:lastValue`.

The entailments below were checked with HermiT 1.4.3 through the expansion of owl-array.md §6
(`Family.java` in [examples/owl-identity](https://github.com/rdf-array/rdf-array/tree/rdf-sequences/examples/owl-identity)).
That expansion gives evidence, not a proof. The claims follow from the definitions.

## 2. [Direct Model-Theoretic Semantics for OWL 2](https://www.w3.org/TR/owl2-direct-semantics/#Direct_Model-Theoretic_Semantics_for_OWL_2)

### 2.1 [Vocabulary](https://www.w3.org/TR/owl2-direct-semantics/#Vocabulary)

<div class="delta" data-kind="Model">
<p><em>V<sub>I</sub></em> also contains every sequence term, and <strong>each occurrence of a sequence term is an anonymous individual of its own</strong>. Two occurrences of <code>( a:Meg a:Chris a:Stewie )</code> are two members of <em>V<sub>I</sub></em>, as <code>_:x</code> and <code>_:y</code> are. <em>V<sub>C</sub></em> contains <code>ra:Sequence</code>; <em>V<sub>OP</sub></em> contains <code>ra:member</code>, <code>ra:first</code> and <code>ra:last</code>; <em>V<sub>DP</sub></em> contains <code>ra:memberValue</code>, <code>ra:length</code>, <code>ra:firstValue</code> and <code>ra:lastValue</code>. The datatype map contains <code>xsd:nonNegativeInteger</code>.</p>
<p>Most of what follows comes from this one decision. Because a sequence term is anonymous, §2.3.7 standardizes its occurrences apart and §2.4 lets a model reinterpret them. Nothing makes two of them equal because their elements are.</p>
</div>

### 2.2 [Interpretations](https://www.w3.org/TR/owl2-direct-semantics/#Interpretations)

<div class="delta" data-kind="Model">
<p>An interpretation also has a set <em>SEQ</em> ⊆ Δ<sub>I</sub> of <em>sequences</em>, a function <em>len</em> from <em>SEQ</em> to the non-negative integers, and a function <em>el</em> that gives, for each <em>x</em> ∈ <em>SEQ</em> and 1 ≤ <em>i</em> ≤ <em>len</em>(<em>x</em>), an element <em>el</em>(<em>x</em>, <em>i</em>) ∈ Δ<sub>I</sub> ∪ Δ<sub>D</sub>. These conditions hold:</p>
<ul>
<li>for each sequence term <em>s</em> = <code>( t1 … tn )</code> in <em>V<sub>I</sub></em>: (<em>s</em>)<sup>I</sup> ∈ <em>SEQ</em>, <em>len</em>((<em>s</em>)<sup>I</sup>) = <em>n</em>, and <em>el</em>((<em>s</em>)<sup>I</sup>, <em>i</em>) is (<em>ti</em>)<sup>I</sup> when <em>ti</em> is an individual and (<em>ti</em>)<sup>LT</sup> when it is a literal;</li>
<li>(<em>a</em>)<sup>I</sup> ∉ <em>SEQ</em> for each individual <em>a</em>, named or anonymous, that is not a sequence term: sequences are a sort of their own, as data values are;</li>
<li>(<code>ra:Sequence</code>)<sup>C</sup> = <em>SEQ</em>;</li>
<li>(<code>ra:member</code>)<sup>OP</sup> = { (<em>x</em>, <em>el</em>(<em>x</em>, <em>i</em>)) | <em>x</em> ∈ <em>SEQ</em>, <em>el</em>(<em>x</em>, <em>i</em>) ∈ Δ<sub>I</sub> }, and (<code>ra:memberValue</code>)<sup>DP</sup> is the same with Δ<sub>D</sub>;</li>
<li>(<code>ra:first</code>)<sup>OP</sup> and (<code>ra:last</code>)<sup>OP</sup> are the same with <em>i</em> = 1 and <em>i</em> = <em>len</em>(<em>x</em>), and likewise for <code>ra:firstValue</code> and <code>ra:lastValue</code>;</li>
<li>(<code>ra:length</code>)<sup>DP</sup> = { (<em>x</em>, <em>len</em>(<em>x</em>)) | <em>x</em> ∈ <em>SEQ</em> }.</li>
</ul>
<p>Nothing requires two sequences with the same <em>len</em> and <em>el</em> to be one element of <em>SEQ</em>. Sequences are not extensional. The converse does hold, because <em>len</em> and <em>el</em> are functions: two sequences that differ in length, or in the element at some position, are different elements of Δ<sub>I</sub>.</p>
<p>In every model of <em>O<sub>G</sub></em>, Peter's <code>a:children</code> value is a sequence <em>x</em> with <em>len</em>(<em>x</em>) = 3 and <em>el</em>(<em>x</em>, 1) = (<code>a:Meg</code>)<sup>I</sup> = (<code>a:Megan</code>)<sup>I</sup>. Since <code>a:Meg</code> ≠ <code>a:Chris</code>, <em>x</em> differs from every sequence whose first element is Chris, such as the value of <code>( a:Chris a:Meg a:Stewie )</code>. OWL-array cannot say so with <code>DifferentIndividuals</code> (§2.3.6), but every model makes the two different.</p>
</div>

The built-ins give the first entailments over the list.

<div class="delta" data-kind="Entailment">
<table class="simple">
<thead><tr><th></th><th>Conclusion</th><th>Through</th></tr></thead>
<tbody>
<tr><td><em>O<sub>G</sub></em> ⊨</td><td class="ent">ObjectPropertyAssertion( a:fatherOf a:Peter a:Megan )</td><td><code>ra:member</code> and the property chain (Table 6): the three <code>a:fatherOf</code> assertions of Structural Spec. §9.6.2's example now follow from one list, and <code>a:Megan</code> through §9.6.1's <code>SameIndividual</code></td></tr>
<tr><td><em>O<sub>G</sub></em> ⊨</td><td class="ent">ClassAssertion( ObjectSomeValuesFrom( a:children ObjectSomeValuesFrom( ra:last a:Boy ) ) a:Peter )</td><td><code>ra:last</code>: the youngest child is a boy</td></tr>
<tr><td><em>O<sub>G</sub></em> ⊨</td><td class="ent">ClassAssertion( ObjectSomeValuesFrom( a:children DataHasValue( ra:length "3"^^xsd:integer ) ) a:Peter )</td><td><code>ra:length</code></td></tr>
<tr><td><em>O<sub>G</sub></em> ⊭</td><td class="ent">ClassAssertion( ObjectMinCardinality( 2 a:children ) a:Peter )</td><td>the list is one value of <code>a:children</code>, however many elements it has</td></tr>
</tbody></table>
<p>§9.6.2 concludes that Peter has at least three children, <code>ObjectMinCardinality( 3 a:fatherOf )</code>. That still holds in every model of <em>O<sub>G</sub></em>. But the chain makes <code>a:fatherOf</code> non-simple, so §2.5's restriction excludes that question, and HermiT does not derive it.</p>
</div>

#### 2.2.1 [Object Property Expressions](https://www.w3.org/TR/owl2-direct-semantics/#Object_Property_Expressions)

Unchanged.

#### 2.2.2 [Data Ranges](https://www.w3.org/TR/owl2-direct-semantics/#Data_Ranges)

Unchanged.

#### 2.2.3 [Class Expressions](https://www.w3.org/TR/owl2-direct-semantics/#Class_Expressions), Table 4

<div class="delta" data-kind="Model">
<table class="simple">
<thead><tr><th>Class Expression</th><th>Interpretation ⋅<sup>C</sup></th></tr></thead>
<tbody><tr><td><code>ObjectTupleOf( u1 … un )</code></td><td>{ <em>x</em> ∈ <em>SEQ</em> | <em>len</em>(<em>x</em>) = <em>n</em> and, for each 1 ≤ <em>i</em> ≤ <em>n</em>, <em>el</em>(<em>x</em>, <em>i</em>) ∈ (<em>ui</em>)<sup>C</sup> if <em>ui</em> is a class expression, ∈ (<em>ui</em>)<sup>DT</sup> if a data range, = (<em>ui</em>)<sup>I</sup> if a named individual, = (<em>ui</em>)<sup>LT</sup> if a literal }</td></tr></tbody>
</table>
<p>An individual inside <code>ObjectTupleOf</code> must be named, as one inside <code>ObjectHasValue</code> must (Structural Spec. §11.2). So <code>ObjectTupleOf</code> is how a class expression mentions a particular sequence, and a sequence term itself never appears in a class expression.</p>
</div>

<div class="delta" data-kind="Entailment">
<table class="simple">
<thead><tr><th></th><th>Conclusion</th><th>Why</th></tr></thead>
<tbody>
<tr><td><em>O<sub>G</sub></em> ⊨</td><td class="ent">ClassAssertion( ObjectSomeValuesFrom( a:children ObjectTupleOf( a:Megan a:Chris a:Stewie ) ) a:Peter )</td><td>one list entails another: equality of an element carries into the sequence (§9.6.1's <code>SameIndividual</code>)</td></tr>
<tr><td><em>O<sub>G</sub></em> ⊨</td><td class="ent">ClassAssertion( ObjectSomeValuesFrom( a:children ObjectTupleOf( owl:Thing owl:Thing a:Boy ) ) a:Peter )</td><td>a class at a position (§9.1.3's <code>a:Boy</code>)</td></tr>
<tr><td><em>O<sub>G</sub></em> ⊭</td><td class="ent">ClassAssertion( ObjectSomeValuesFrom( a:children ObjectTupleOf( a:Chris a:Megan a:Stewie ) ) a:Peter )</td><td>order matters</td></tr>
<tr><td><em>O<sub>G</sub></em> ⊭</td><td class="ent">ClassAssertion( ObjectComplementOf( ObjectSomeValuesFrom( a:children ObjectTupleOf( a:Chris a:Megan a:Stewie ) ) ) a:Peter )</td><td>Peter may have another <code>a:children</code> value</td></tr>
<tr><td><em>O<sub>G</sub></em> ∪ { <code>FunctionalObjectProperty( a:children )</code> } ⊨</td><td class="ent">ClassAssertion( ObjectComplementOf( ObjectSomeValuesFrom( a:children ObjectTupleOf( a:Chris a:Megan a:Stewie ) ) ) a:Peter )</td><td>the one value has Meg first, and Meg ≠ Chris</td></tr>
</tbody></table>
<p>Compare the end of Structural Spec. §9.6.2. There, <code>FunctionalObjectProperty( a:fatherOf )</code> makes the example inconsistent, because Meg, Chris and Stewie would have to be one individual. A functional <code>a:children</code> is consistent, because one sequence holds all three.</p>
</div>

### 2.3 [Satisfaction in an Interpretation](https://www.w3.org/TR/owl2-direct-semantics/#Satisfaction_in_an_Interpretation)

Tables 5 to 10 are unchanged. A sequence term enters an axiom as an individual, and an axiom
holding one is satisfied when its condition holds of the term's interpretation from §2.2.

#### 2.3.1 [Class Expression Axioms](https://www.w3.org/TR/owl2-direct-semantics/#Class_Expression_Axioms)

Unchanged.

#### 2.3.2 [Object Property Expression Axioms](https://www.w3.org/TR/owl2-direct-semantics/#Object_Property_Expression_Axioms)

Unchanged. A property chain through `ra:member` or `ra:first` is an ordinary chain; its entailments
are in the box after §2.2.

#### 2.3.3 [Data Property Expression Axioms](https://www.w3.org/TR/owl2-direct-semantics/#Data_Property_Expression_Axioms)

Unchanged.

#### 2.3.4 [Datatype Definitions](https://www.w3.org/TR/owl2-direct-semantics/#Datatype_Definitions)

Unchanged.

#### 2.3.5 [Keys](https://www.w3.org/TR/owl2-direct-semantics/#Keys)

<div class="delta" data-kind="Entailment">
<p>Table 9 is unchanged, but it no longer reaches sequences. A sequence is never the interpretation of a named individual, so in some model none is in NAMED. A key therefore never entails that two sequences are equal, and never identifies two individuals through a sequence-valued key property. To get identity by elements, an ontology needs a construct of its own. owl-array.md §10.5 leaves that construct open.</p>
</div>

#### 2.3.6 [Assertions](https://www.w3.org/TR/owl2-direct-semantics/#Assertions)

<div class="delta" data-kind="Model">
<p>Table 10 is unchanged. Because a sequence term is an anonymous individual, Structural Spec. §11.2 keeps it out of <code>SameIndividual</code>, <code>DifferentIndividuals</code> and the negative property assertions, and out of <code>ObjectOneOf</code> and <code>ObjectHasValue</code>. The link between a sequence and its elements is not an <code>ObjectPropertyAssertion</code>, so it adds no edge to §11.2's forest condition.</p>
</div>

#### 2.3.7 [Ontologies](https://www.w3.org/TR/owl2-direct-semantics/#Ontologies)

<div class="delta" data-kind="Model">
<p>The axiom closure is satisfied with anonymous individuals <strong>and sequence terms</strong> standardized apart. Every occurrence of a sequence term in the closure is a distinct anonymous individual. That includes two occurrences in one axiom and occurrences in different imported ontologies. A structurally equal axiom stated twice is still one axiom, so it adds no second occurrence.</p>
<p>Add Lois with the same children to <em>O<sub>G</sub></em>, and compare a data value from Structural Spec. §9.5 (Keys):</p>
<table class="simple">
<thead><tr><th>Premises</th><th>Conclusion</th><th></th></tr></thead>
<tbody>
<tr><td><em>O<sub>G</sub></em> ∪ { <code>ObjectPropertyAssertion( a:children a:Lois ( a:Meg a:Chris a:Stewie ) )</code> }</td><td class="ent">ClassAssertion( ObjectSomeValuesFrom( a:children ObjectTupleOf( a:Megan a:Chris a:Stewie ) ) a:Lois )</td><td>⊨</td></tr>
<tr><td>the same</td><td>the query ∃ <em>x</em> : a:children(a:Peter, <em>x</em>) ∧ a:children(a:Lois, <em>x</em>)</td><td>⊭: the two lists may be one sequence or two</td></tr>
<tr><td><code>DataPropertyAssertion( a:hasSSN a:Peter "123-45-6789" )</code>, <code>DataPropertyAssertion( a:hasSSN a:Peter_Griffin "123-45-6789" )</code></td><td>the query ∃ <em>y</em> : a:hasSSN(a:Peter, <em>y</em>) ∧ a:hasSSN(a:Peter_Griffin, <em>y</em>)</td><td>⊨: a literal denotes one value in every interpretation</td></tr>
</tbody></table>
<p>Here OWL-array departs from treating a sequence like a literal, the design owl-array.md §10 calls A. A sequence is like a blank node with a fixed description. Two of them are not entailed to be one thing, and not entailed to be two. This agrees with RDF simple entailment over the same data, and with OWL 2, which entails nothing about two RDF 1.1 lists here because they are anonymous individuals (owl-array.md §10.4.1).</p>
</div>

### 2.4 [Models](https://www.w3.org/TR/owl2-direct-semantics/#Models)

<div class="delta" data-kind="Entailment">
<p>The definition is unchanged. But the interpretation <em>J</em> it asks for may now reinterpret sequence terms, as it reinterprets anonymous individuals. So a sequence term in an entailed ontology <em>O<sub>1</sub></em> is read existentially, and one list entails another directly:</p>
<table class="simple">
<thead><tr><th></th><th>Entailed ontology <em>O<sub>1</sub></em></th><th>Why</th></tr></thead>
<tbody>
<tr><td><em>O<sub>G</sub></em> ⊨</td><td class="ent">ObjectPropertyAssertion( a:children a:Peter ( a:Megan a:Chris a:Stewie ) )</td><td>Peter's list witnesses the new term</td></tr>
<tr><td><em>O<sub>G</sub></em> ⊨</td><td class="ent">ObjectPropertyAssertion( a:children a:Peter ( a:Meg a:Chris a:Stewie ) ), ObjectPropertyAssertion( a:children a:Peter ( a:Megan a:Chris a:Stewie ) )</td><td>two occurrences, one witness: no design counts occurrences</td></tr>
<tr><td><em>O<sub>G</sub></em> ⊭</td><td class="ent">ObjectPropertyAssertion( a:children a:Peter ( a:Chris a:Meg a:Stewie ) )</td><td>no witness in some model</td></tr>
</tbody></table>
</div>

### 2.5 [Inference Problems](https://www.w3.org/TR/owl2-direct-semantics/#Inference_Problems)

Unchanged. Instance checking and the atoms of a Boolean conjunctive query name only named
individuals, so a question about a sequence is asked through the property that holds it, as in the
tables above. §2.5's restriction to simple properties in cardinalities applies as before; a chain
through `ra:member` makes its super-property non-simple (§2.2 above).

## 3. [Independence of the Direct Semantics from the Datatype Map](https://www.w3.org/TR/owl2-direct-semantics/#Independence_of_the_Direct_Semantics_from_the_Datatype_Map_in_OWL_2_DL_.28Informative.29)

Unchanged. Overall, the datatype map changes only by requiring `xsd:nonNegativeInteger`; Tables 1, 3
and 5 to 10 and the definitions of §2.4 and §2.5 are unchanged. The RDF-Based Semantics is not addressed. Under it, design B needs no extensionality
condition for sequences. Design A would have needed one.

[OWL 2 Direct Semantics]: https://www.w3.org/TR/owl2-direct-semantics/
[OWL 2 Structural Specification]: https://www.w3.org/TR/owl2-syntax/
