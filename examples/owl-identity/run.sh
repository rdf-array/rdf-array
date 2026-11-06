#!/bin/sh
# Compiles and runs the identity experiments of docs/owl-array.md §10.4.
#   PROTEGE  a Protégé 5.6.9 directory (its OWL API 4.5.29 and HermiT 1.4.3 bundles)
#   M2       Maven repositories (space-separated) holding the OWL API's runtime dependencies and Apache Jena 4.8.0
#   JAVA     a JDK 21 bin directory
# ./run.sh            the RedThing case (Red, RedJ) and the checks of §10.4.2 (Tuple)
# ./run.sh scale N    one timing of §10.4.3; -Dmode=data|obj|shared|nominal|hybrid -Dk=K in JAVA_OPTS
set -e
: "${PROTEGE:?set PROTEGE}" "${M2:=$HOME/.m2/repository}" "${JAVA:=$(dirname "$(command -v java)")}"
cd "$(dirname "$0")"
jars() { find $M2 -name '*.jar' \( "$@" \) | grep -v '/org/apache/jena/' | tr '\n' ':'; }
CPO="$PROTEGE/bundles/owlapi-osgidistribution.jar:$PROTEGE/plugins/org.semanticweb.hermit-1.4.3.456.jar:$PROTEGE/bundles/guava.jar:$PROTEGE/bundles/commons-io.jar:$PROTEGE/bundles/jsr305.jar:$PROTEGE/bundles/slf4j-api.jar:$PROTEGE/bundles/org.apache.servicemix.bundles.javax-inject.jar:$(jars -path '*caffeine*' -o -path '*commons-rdf*' -o -path '*hppc*' -o -path '*xz*' -o -path '*rdf4j*' -o -path '*commons-compress*' -o -path '*jaxb*' -o -path '*commons-logging*' -o -path '*axiom*' -o -path '*automaton*')"
CPJ="$(find $M2 -name 'jena-*-4.8.0.jar' \( -name 'jena-shaded-guava-*' -o -name 'jena-core-*' -o -name 'jena-arq-*' -o -name 'jena-base-*' -o -name 'jena-iri-*' \) | tr '\n' ':')"
CPJ="$CPJ$(jars -path '*slf4j-api*' -o -path '*commons-lang3*' -o -path '*commons-cli*' -o -path '*commons-io*' -o -path '*commons-codec*' -o -path '*commons-compress*' -o -path '*caffeine*' -o -path '*titanium*' -o -path '*jakarta.json*' -o -path '*libthrift*' -o -path '*collection*' -o -path '*roaring*' -o -path '*xercesImpl*' -o -path '*xml-apis*' -o -path '*protobuf*')"
OUT=$(mktemp -d)
"$JAVA/javac" -d "$OUT" -cp "$CPO" Red.java Tuple.java
"$JAVA/javac" -d "$OUT" -cp "$CPJ" RedJ.java
if [ "$1" = scale ]; then "$JAVA/java" $JAVA_OPTS -cp "$CPO:$OUT" Tuple "$@"; exit; fi
"$JAVA/java" -cp "$CPO:$OUT" Red | grep -v '^  ax'
"$JAVA/java" -cp "$CPJ:$OUT" RedJ
"$JAVA/java" -cp "$CPO:$OUT" Tuple
