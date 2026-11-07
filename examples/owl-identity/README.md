# When are two sequences one individual? The experiments

*Example, 2026-11-06. The sources behind [owl-array.md §10.4](../../docs/owl-array.html#results),
which compares OWL-array's designs for the identity of sequences.*

| File | What it runs |
|---|---|
| [`Red.java`](Red.java) | §10.4.1 with the OWL API 4.5.29 and HermiT 1.4.3: `ex:RedThing ≡ ex:rgb value ( 255 0 0 )` and `ex:x ex:rgb ( 255 0 0 )` as Turtle 1.1, in two documents and in one, and with a named `ex:red` as a control; prints the unparsed triples and the OWL 2 DL profile check |
| [`RedJ.java`](RedJ.java) | the same case with Apache Jena 4.8.0's OWL and OWL Micro rule reasoners |
| [`Tuple.java`](Tuple.java) | §10.4.2 and §10.4.3: a scratch expansion of design B (one named individual per occurrence, functional position properties `ra:o_i` and `ra:d_i`, closure after the last position, `ra:tupleOf` as an intersection) checked case by case with HermiT, and timed with `scale` |
| [`Family.java`](Family.java) | the entailments of [owl-direct-semantics-array.html](../../docs/owl-direct-semantics-array.html): the OWL 2 Structural Specification's Griffin family examples with `a:children ( a:Meg a:Chris a:Stewie )`, through `Tuple`'s expansion |
| [`run.sh`](run.sh) | compiles and runs them |

```sh
PROTEGE=/path/to/Protege-5.6.9 M2="$HOME/.m2/repository /path/to/owlapi-deps" JAVA=/path/to/jdk-21/bin ./run.sh
JAVA_OPTS="-Dmode=hybrid -Dk=20" PROTEGE=… ./run.sh scale 5000
```

`mode` is `data` (structural, literal elements), `obj` (structural, individual elements), `shared`
(structural, one individual for equal sequences), `nominal` (a named individual per distinct
sequence and `value`, the stand-in for design A) or `hybrid`; `scale N key` adds the key of design B+K.
The expansion is not owlapi-array's: that one still implements design A.
