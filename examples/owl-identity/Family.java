import org.semanticweb.owlapi.model.*; import org.semanticweb.owlapi.reasoner.*; import java.util.*;
/** The OWL 2 Syntax running example (the Griffins) extended with one ordered list, through Tuple's expansion. */
public class Family extends Tuple {
  static OWLObjectProperty MEMBER, LAST;
  static void base(boolean functional) throws Exception {
    fresh();
    MEMBER=df.getOWLObjectProperty(IRI.create(RA+"member")); LAST=df.getOWLObjectProperty(IRI.create(RA+"last"));
    if (functional) add(df.getOWLFunctionalObjectPropertyAxiom(op("children")));
    // the expansion's ra:member and ra:last for one occurrence
    OWLNamedIndividual s=seq(ind("Meg"),ind("Chris"),ind("Stewie"));
    for (String m: List.of("Meg","Chris","Stewie")) add(df.getOWLObjectPropertyAssertionAxiom(MEMBER,s,ind(m)));
    add(df.getOWLObjectPropertyAssertionAxiom(LAST,s,ind("Stewie")));
    add(df.getOWLObjectPropertyAssertionAxiom(op("children"),ind("Peter"),s));
    add(df.getOWLSameIndividualAxiom(ind("Meg"),ind("Megan")));
    add(df.getOWLDifferentIndividualsAxiom(ind("Peter"),ind("Meg"),ind("Chris"),ind("Stewie")));
    add(df.getOWLClassAssertionAxiom(cls("Boy"),ind("Stewie")));
    add(df.getOWLSubPropertyChainOfAxiom(List.of(op("children"),MEMBER), op("fatherOf")));
  }
  static OWLClassExpression some(String p, OWLClassExpression c){ return df.getOWLObjectSomeValuesFrom(op(p),c); }
  static boolean is(String i, OWLClassExpression c){ return r().isEntailed(df.getOWLClassAssertionAxiom(c,ind(i))); }
  public static void main(String[] a) throws Exception {
    base(false);
    say("E1 Peter children (Megan Chris Stewie)", is("Peter", some("children", tupleOf(ind("Megan"),ind("Chris"),ind("Stewie")))), true);
    say("E2 Peter children (Chris Megan Stewie), children not functional", is("Peter", some("children", tupleOf(ind("Chris"),ind("Megan"),ind("Stewie")))), false);
    say("E2 Peter not children (Chris Megan Stewie), not functional", is("Peter", df.getOWLObjectComplementOf(some("children", tupleOf(ind("Chris"),ind("Megan"),ind("Stewie"))))), false);
    say("E3 Peter fatherOf Megan", r().isEntailed(df.getOWLObjectPropertyAssertionAxiom(op("fatherOf"),ind("Peter"),ind("Megan"))), true);
    say("E3 Peter fatherOf min 3: not derived, fatherOf is non-simple", is("Peter", df.getOWLObjectMinCardinality(3, op("fatherOf"))), false);
    say("E4 Peter children some (ra:last some Boy)", is("Peter", some("children", df.getOWLObjectSomeValuesFrom(LAST, cls("Boy")))), true);
    say("E4 Peter children some tupleOf(Thing Thing Boy)", is("Peter", some("children", tupleOf(df.getOWLThing(),df.getOWLThing(),cls("Boy")))), true);
    say("E5 Peter children some (ra:length value 3)", is("Peter", some("children", df.getOWLDataHasValue(LEN, df.getOWLLiteral(3)))), true);
    say("E7 Peter children min 2", is("Peter", df.getOWLObjectMinCardinality(2, op("children"))), false);
    base(true);
    say("E2 functional: Peter not children some (Chris Megan Stewie)", is("Peter", df.getOWLObjectComplementOf(some("children", tupleOf(ind("Chris"),ind("Megan"),ind("Stewie"))))), true);
    base(false);
    OWLNamedIndividual l=seq(ind("Meg"),ind("Chris"),ind("Stewie")); add(df.getOWLObjectPropertyAssertionAxiom(op("children"),ind("Lois"),l));
    OWLNamedIndividual p=(OWLNamedIndividual)o.getObjectPropertyAssertionAxioms(ind("Peter")).iterator().next().getObject();
    say("E6 Peter's and Lois's lists the same", r().isEntailed(df.getOWLSameIndividualAxiom(p,l)), false);
    say("E6 Peter's and Lois's lists different", r().isEntailed(df.getOWLDifferentIndividualsAxiom(p,l)), false);
    say("E6 Lois children some tupleOf(Megan Chris Stewie)", is("Lois", some("children", tupleOf(ind("Megan"),ind("Chris"),ind("Stewie")))), true);
    base(false);
    OWLNamedIndividual l2=seq(ind("Chris"),ind("Meg"),ind("Stewie")); add(df.getOWLObjectPropertyAssertionAxiom(op("children"),ind("Lois"),l2));
    OWLNamedIndividual p2=(OWLNamedIndividual)o.getObjectPropertyAssertionAxioms(ind("Peter")).iterator().next().getObject();
    say("E8 (Meg Chris Stewie) differs from (Chris Meg Stewie)", r().isEntailed(df.getOWLDifferentIndividualsAxiom(p2,l2)), true);
  }
}
