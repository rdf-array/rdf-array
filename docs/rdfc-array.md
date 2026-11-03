# RDFC-array: RDFC-1.0 over rdf-array

*Definition, 2026-11-03. Implemented in [rdf-canonize-array](https://github.com/rdf-array/rdf-canonize-array) and in
[oxigraph-array](https://github.com/rdf-array/oxigraph-array)'s `oxrdf`, which agree on the tests of
[rdf-tests-contrib](https://github.com/rdf-array/rdf-tests-contrib)'s `rdf/rdf-canon`. [rdf-array.md](rdf-array.html) describes
the change from RDF to rdf-array.*

RDFC-array is [RDF Dataset Canonicalization](https://www.w3.org/TR/rdf-canon/) (RDFC-1.0) over a dataset whose subjects and
objects may be sequences. A dataset with no sequence gives exactly what RDFC-1.0 gives, byte for byte: every change below applies
only to a quad holding one, and W3C's rdf-canon suite passes unchanged.

## 1. The canonical spelling

A sequence is written `(e1 e2 …)`: one space between elements, none inside the parentheses, and `()` when empty. Each element
is written as a term of canonical N-Quads, and a nested sequence by this same rule.

## 2. Changes to the algorithm

The step numbers are those of RDFC-1.0.

1. **Blank node to quads map (§4.4.3 step 2).** A blank node occurs in a quad if it is the subject, object or graph name, or an
   element of a subject or object sequence, at any depth.
2. **Hash First Degree Quads (§4.6.3 step 3).** The blank nodes inside a sequence are replaced by `_:a` and `_:z` like any other.
3. **Hash N-Degree Quads (§4.8.3 step 3).** A blank node inside a sequence, other than the reference blank node, is a related
   blank node once for each place it occurs. Its *position*, passed to Hash Related Blank Node, is `s` or `o` for the sequence's
   place in the quad, followed by `-` and the zero-based index at each level: `o-1-0` is the first element of the second element
   of an object sequence.
4. **Hash N-Degree Quads, before step 6.** Append to *data to hash* each quad of the reference blank node that holds a sequence,
   written in canonical N-Quads with a line ending, using for each blank node its canonical identifier if it has one and otherwise
   its identifier from the issuer. These lines are sorted first. All these blank nodes have identifiers by this point, because each
   is the reference blank node or related to it.
5. **Serialized canonical form (§4.4.3 step 7, §5).** Blank nodes inside sequences are replaced by their canonical identifiers.

## 3. Why step 4 is needed

Hash Related Blank Node sees pairs: the reference blank node and one other. That describes an ordinary dataset, whose quads relate
at most three blank nodes, each of them visible as a subject, object or graph name. A sequence ties together any number, and pairs
do not say which ones share a sequence:

```
<s> <p> (_:x _:y _:a) .
<s> <p> (_:x _:u _:b) .
<s> <p> (_:w _:y _:b) .
<s> <p> (_:w _:u _:a) .
```

Every pair here occurs once at each pair of positions, and so it does if `_:a` and `_:b` trade places. Without step 4, two choices
of identifiers can give the same hash and yet different datasets, so the result depends on the input's labels or order. In 200
random datasets in which every blank node occurs once at every position, 13 gave different results under shuffled labels with step 3 alone; with
step 4, none of 600 did. That is a test and not a proof. The argument for step 4 is that a path now spells out every sequence
that a blank node on it holds, so two equal hashes describe the same sequences under the same identifiers.

The index path in step 3 is not needed for that. It keeps one blank node's places in a sequence apart from one another and
from its place as a plain object, which would otherwise share a related hash.

## 4. Not settled

- **Complexity.** Step 4 adds work in proportion to the quads holding sequences, but ties remain as costly as RDFC-1.0's
  [dataset poisoning](https://www.w3.org/TR/rdf-canon/#dataset-poisoning), and a sequence makes many ties easy to write, as above.
  Implementations should keep their limits on deep iterations.
- **A sequence in a triple term.** `oxrdf` hashes blank nodes in one; the tests have none, since jena-array and N3.js-array
  reject them.
- **The name.** Output from this algorithm is not RDFC-1.0 output when a sequence is present, and it has no identifier of its own
  for use in signatures.

## 5. Slots

On the `rdf-undef` branch ([rdf-undef.md](rdf-undef.html)) a sequence may hold empty slots. The algorithm needs nothing further:
a slot holds no blank node, and it is written `undef`, in lowercase, like any other element. It counts as an element in an index
path, so the `_:x` of `(undef _:x)` is at `o-1`.
