import org.semanticweb.owlapi.apibinding.OWLManager; import org.semanticweb.owlapi.model.*; import org.semanticweb.owlapi.reasoner.*; import org.semanticweb.HermiT.ReasonerFactory; import java.util.*;
/** Scratch expansion: each sequence occurrence is its own named individual (no unique names, so two may
 *  still be the same), with ra:length and functional positional properties ra:o_i (individuals) and
 *  ra:d_i (data values). ra:tupleOf(C1..Cn) = ra:Sequence and length n and, at each i, a filler in Ci. */
public class Tuple {
  static final String E="http://example/", RA="https://rdf-array.github.io/rdf-array/vocab#";
  static OWLOntologyManager man=OWLManager.createOWLOntologyManager(); static OWLDataFactory df=man.getOWLDataFactory();
  static OWLOntology o; static int occ=0;
  static OWLNamedIndividual ind(String n){return df.getOWLNamedIndividual(IRI.create(E+n));}
  static OWLClass cls(String n){return df.getOWLClass(IRI.create(E+n));}
  static OWLObjectProperty op(String n){return df.getOWLObjectProperty(IRI.create(E+n));}
  static OWLClass SEQ=df.getOWLClass(IRI.create(RA+"Sequence"));
  static OWLDataProperty LEN=df.getOWLDataProperty(IRI.create(RA+"length"));
  static OWLObjectProperty oAt(int i){OWLObjectProperty p=df.getOWLObjectProperty(IRI.create(RA+"o_"+i)); add(df.getOWLFunctionalObjectPropertyAxiom(p)); add(df.getOWLObjectPropertyDomainAxiom(p,SEQ)); return p;}
  static OWLDataProperty dAt(int i){OWLDataProperty p=df.getOWLDataProperty(IRI.create(RA+"d_"+i)); add(df.getOWLFunctionalDataPropertyAxiom(p)); add(df.getOWLDataPropertyDomainAxiom(p,SEQ)); return p;}
  static void add(OWLAxiom a){ man.addAxiom(o,a); }
  static OWLLiteral lit(Object x){ return x instanceof Integer i ? df.getOWLLiteral(i) : (OWLLiteral)x; }
  /** One occurrence of a sequence in the data: a fresh individual. */
  static OWLNamedIndividual seq(Object... els){
    OWLNamedIndividual s=ind("occ"+(++occ)); add(df.getOWLClassAssertionAxiom(SEQ,s));
    add(df.getOWLDataPropertyAssertionAxiom(LEN,s,df.getOWLLiteral(els.length)));
    for (int i=1;i<=els.length;i++){ Object e=els[i-1];
      if (e instanceof OWLIndividual x) add(df.getOWLObjectPropertyAssertionAxiom(oAt(i),s,x));
      else if (e instanceof Object[] inner) add(df.getOWLObjectPropertyAssertionAxiom(oAt(i),s,seq(inner)));
      else add(df.getOWLDataPropertyAssertionAxiom(dAt(i),s,lit(e))); }
    // closure: no positions beyond the length
    add(df.getOWLClassAssertionAxiom(df.getOWLObjectMaxCardinality(0,oAt(els.length+1)),s));
    add(df.getOWLClassAssertionAxiom(df.getOWLDataMaxCardinality(0,dAt(els.length+1)),s));
    return s; }
  /** ra:tupleOf: an element is a nominal (individual), a data value, a class or a nested tupleOf. */
  static OWLClassExpression tupleOf(Object... cs){
    Set<OWLClassExpression> parts=new LinkedHashSet<>(); parts.add(SEQ); parts.add(df.getOWLDataHasValue(LEN,df.getOWLLiteral(cs.length)));
    for (int i=1;i<=cs.length;i++){ Object c=cs[i-1];
      if (c instanceof OWLIndividual x) parts.add(df.getOWLObjectHasValue(oAt(i),x));
      else if (c instanceof OWLClassExpression ce) parts.add(df.getOWLObjectSomeValuesFrom(oAt(i),ce));
      else parts.add(df.getOWLDataHasValue(dAt(i),lit(c))); }
    return df.getOWLObjectIntersectionOf(parts); }
  static void fresh() throws Exception { man=OWLManager.createOWLOntologyManager(); df=man.getOWLDataFactory(); o=man.createOntology(IRI.create(E+"t"+System.nanoTime())); occ=0; add(df.getOWLFunctionalDataPropertyAxiom(LEN)); }
  static OWLReasoner r(){ return new ReasonerFactory().createReasoner(o); }
  static void say(String what, boolean got, boolean want){ System.out.printf("  %-4s %-70s %s%n", got==want?"ok":"FAIL", what, got); }

  public static void main(String[] a) throws Exception {
    if (a.length>0 && a[0].equals("scale")) { scale(Integer.parseInt(a[1]), a.length>2); return; }
    OWLObjectProperty rgb=op("rgb"), authorList=op("authorList"), p=op("p"), code=op("code");
    System.out.println("T1 RedThing ≡ ∃rgb.tupleOf(255 0 0); x rgb (255 0 0) [two occurrences, no identity]");
    fresh(); add(df.getOWLEquivalentClassesAxiom(cls("RedThing"), df.getOWLObjectSomeValuesFrom(rgb,tupleOf(255,0,0))));
    add(df.getOWLObjectPropertyAssertionAxiom(rgb,ind("x"),seq(255,0,0)));
    add(df.getOWLObjectPropertyAssertionAxiom(rgb,ind("y"),seq(0,0,255)));
    add(df.getOWLObjectPropertyAssertionAxiom(rgb,ind("z"),seq(255,0)));
    add(df.getOWLFunctionalObjectPropertyAxiom(op("rgbF")));
    add(df.getOWLObjectPropertyAssertionAxiom(op("rgbF"),ind("w"),seq(0,0,255)));
    add(df.getOWLEquivalentClassesAxiom(cls("RedF"), df.getOWLObjectSomeValuesFrom(op("rgbF"),tupleOf(255,0,0))));
    OWLReasoner h=r();
    say("consistent", h.isConsistent(), true);
    say("x a RedThing", h.isEntailed(df.getOWLClassAssertionAxiom(cls("RedThing"),ind("x"))), true);
    say("y a RedThing  (0 0 255)", h.isEntailed(df.getOWLClassAssertionAxiom(cls("RedThing"),ind("y"))), false);
    say("z a RedThing  (255 0)", h.isEntailed(df.getOWLClassAssertionAxiom(cls("RedThing"),ind("z"))), false);
    say("w a not RedF  (functional rgbF, (0 0 255))", h.isEntailed(df.getOWLClassAssertionAxiom(df.getOWLObjectComplementOf(cls("RedF")),ind("w"))), true);
    say("occ(0 0 255) differentFrom occ(255 0 0)", h.isEntailed(df.getOWLDifferentIndividualsAxiom(ind("occ1"),ind("occ2"))), true);
    say("occ(255 0) differentFrom occ(255 0 0)  (by length)", h.isEntailed(df.getOWLDifferentIndividualsAxiom(ind("occ1"),ind("occ3"))), true);

    System.out.println("T2 sameAs through elements: p authorList (ada alan grace), ada sameAs adaL");
    fresh(); add(df.getOWLObjectPropertyAssertionAxiom(authorList,ind("paper"),seq(ind("ada"),ind("alan"),ind("grace"))));
    add(df.getOWLSameIndividualAxiom(ind("ada"),ind("adaL")));
    h=r();
    say("paper a ∃authorList.tupleOf(adaL alan grace)", h.isEntailed(df.getOWLClassAssertionAxiom(df.getOWLObjectSomeValuesFrom(authorList,tupleOf(ind("adaL"),ind("alan"),ind("grace"))),ind("paper"))), true);
    say("paper a ∃authorList.tupleOf(alan ada grace)", h.isEntailed(df.getOWLClassAssertionAxiom(df.getOWLObjectSomeValuesFrom(authorList,tupleOf(ind("alan"),ind("ada"),ind("grace"))),ind("paper"))), false);
    say("paper a ∃authorList.tupleOf(Person-free: owl:Thing x3)", h.isEntailed(df.getOWLClassAssertionAxiom(df.getOWLObjectSomeValuesFrom(authorList,tupleOf(df.getOWLThing(),df.getOWLThing(),df.getOWLThing())),ind("paper"))), true);

    System.out.println("T3 occurrences: N1 p (1 2) . N2 p (1 2)");
    fresh(); OWLNamedIndividual s1=seq(1,2), s2=seq(1,2), s3=seq(1,3);
    add(df.getOWLObjectPropertyAssertionAxiom(p,ind("N1"),s1)); add(df.getOWLObjectPropertyAssertionAxiom(p,ind("N2"),s2)); add(df.getOWLObjectPropertyAssertionAxiom(p,ind("N3"),s3));
    h=r();
    say("occ1 sameAs occ2 (equal elements)", h.isEntailed(df.getOWLSameIndividualAxiom(s1,s2)), false);
    say("occ1 differentFrom occ2", h.isEntailed(df.getOWLDifferentIndividualsAxiom(s1,s2)), false);
    say("occ1 differentFrom occ3 (1 3)", h.isEntailed(df.getOWLDifferentIndividualsAxiom(s1,s3)), true);
    say("N2 a ∃p.{occ1}  (no join)", h.isEntailed(df.getOWLClassAssertionAxiom(df.getOWLObjectHasValue(p,s1),ind("N2"))), false);

    System.out.println("T4 keys: code inverse functional, a code (1 2), b code (1 2)");
    fresh(); add(df.getOWLInverseFunctionalObjectPropertyAxiom(code));
    add(df.getOWLObjectPropertyAssertionAxiom(code,ind("a"),seq(1,2))); add(df.getOWLObjectPropertyAssertionAxiom(code,ind("b"),seq(1,2)));
    h=r(); say("a sameAs b, no key", h.isEntailed(df.getOWLSameIndividualAxiom(ind("a"),ind("b"))), false);
    OWLDataProperty d1=dAt(1), d2=dAt(2);
    add(df.getOWLHasKeyAxiom(SEQ, Set.of(LEN,d1,d2)));
    h=r(); say("a sameAs b, with HasKey(ra:Sequence length d_1 d_2)", h.isEntailed(df.getOWLSameIndividualAxiom(ind("a"),ind("b"))), true);

    System.out.println("T5 nesting and classes: shape ≡ ∃pts.tupleOf(tupleOf(0 0), tupleOf(1 0), ∃... any pair)");
    fresh(); OWLClassExpression pair=tupleOf(df.getOWLThing(),df.getOWLThing());
    OWLClassExpression any=df.getOWLObjectIntersectionOf(SEQ, df.getOWLDataHasValue(LEN,df.getOWLLiteral(2)));
    add(df.getOWLEquivalentClassesAxiom(cls("FromOrigin"), df.getOWLObjectSomeValuesFrom(op("pts"),tupleOf(tupleOf(0,0),any))));
    add(df.getOWLObjectPropertyAssertionAxiom(op("pts"),ind("seg"),seq(new Object[]{0,0},new Object[]{1,0})));
    add(df.getOWLObjectPropertyAssertionAxiom(op("pts"),ind("seg2"),seq(new Object[]{1,1},new Object[]{1,0})));
    h=r(); say("seg a FromOrigin", h.isEntailed(df.getOWLClassAssertionAxiom(cls("FromOrigin"),ind("seg"))), true);
    say("seg2 a FromOrigin", h.isEntailed(df.getOWLClassAssertionAxiom(cls("FromOrigin"),ind("seg2"))), false);

    System.out.println("T8 hybrid: ByAdaL ≡ ∃authorList.Tup(adaL alan grace), Tup ⊑ tupleOf(...); occurrence asserted Tup(ada alan grace); ada sameAs adaL");
    fresh(); { OWLClass tA=cls("Tup_ada"), tL=cls("Tup_adaL");
      add(df.getOWLSubClassOfAxiom(tA,tupleOf(ind("ada"),ind("alan"),ind("grace")))); add(df.getOWLSubClassOfAxiom(tL,tupleOf(ind("adaL"),ind("alan"),ind("grace"))));
      add(df.getOWLEquivalentClassesAxiom(cls("ByAdaL"), df.getOWLObjectSomeValuesFrom(authorList,tL)));
      OWLNamedIndividual s8=seq(ind("ada"),ind("alan"),ind("grace")); add(df.getOWLClassAssertionAxiom(tA,s8));
      add(df.getOWLObjectPropertyAssertionAxiom(authorList,ind("paper"),s8)); add(df.getOWLSameIndividualAxiom(ind("ada"),ind("adaL")));
      h=r(); say("paper a ByAdaL (defined through the named tuple class)", h.isEntailed(df.getOWLClassAssertionAxiom(cls("ByAdaL"),ind("paper"))), false);
      say("paper a ∃authorList.tupleOf(adaL alan grace) (structural query)", h.isEntailed(df.getOWLClassAssertionAxiom(df.getOWLObjectSomeValuesFrom(authorList,tupleOf(ind("adaL"),ind("alan"),ind("grace"))),ind("paper"))), true); }
    System.out.println("T6 Swatch: Swatch ⊑ ∀rgb.(length 3); red a Swatch, red rgb (255 0)");
    fresh(); add(df.getOWLSubClassOfAxiom(cls("Swatch"), df.getOWLObjectAllValuesFrom(rgb, df.getOWLDataHasValue(LEN,df.getOWLLiteral(3)))));
    add(df.getOWLClassAssertionAxiom(cls("Swatch"),ind("red"))); add(df.getOWLObjectPropertyAssertionAxiom(rgb,ind("red"),seq(255,0)));
    h=r(); say("inconsistent", !h.isConsistent(), true);

  }
  /** hybrid: a named class per ground tuple, below its structural definition; occurrences asserted into it by contents */
  static OWLClass tupCls(int c){ OWLClass t=cls("Tup_"+c+"_"+(c+1)+"_"+(c+2)); add(df.getOWLSubClassOfAxiom(t, tupleOf(c,c+1,c+2))); return t; }
  static OWLNamedIndividual hyb(int c){ OWLNamedIndividual s=seq(c,c+1,c+2); add(df.getOWLClassAssertionAxiom(tupCls(c),s)); return s; }
  static int K=Integer.getInteger("k",20); static void scale(int n, boolean key) throws Exception {
    OWLObjectProperty rgb=op("rgb"); OWLReasoner h;
    fresh(); Random rnd=new Random(1);
    String mode=System.getProperty("mode","data"); Map<Integer,OWLNamedIndividual> shared=new HashMap<>();
    java.util.function.IntFunction<Object> el = v -> mode.equals("obj") ? ind("v"+v) : (Object)v;
    for (int c=0;c<K;c++) add(df.getOWLEquivalentClassesAxiom(cls("C"+c), df.getOWLObjectSomeValuesFrom(rgb,
        mode.equals("nominal") ? df.getOWLObjectOneOf(ind("col"+c)) : mode.equals("hybrid") ? tupCls(c) : tupleOf(el.apply(c),el.apply(c+1),el.apply(c+2)))));
    if (key) add(df.getOWLHasKeyAxiom(SEQ, Set.of(LEN,dAt(1),dAt(2),dAt(3))));
    for (int i=0;i<n;i++){ int c=rnd.nextInt(K); add(df.getOWLObjectPropertyAssertionAxiom(rgb,ind("t"+i), mode.equals("nominal") ? ind("col"+c) : mode.equals("hybrid") ? hyb(c) : mode.equals("shared") ? shared.computeIfAbsent(c, cc -> seq(cc,cc+1,cc+2)) : seq(el.apply(c),el.apply(c+1),el.apply(c+2)))); }
    long t0=System.nanoTime(); h=r(); boolean ok=h.isConsistent(); long t1=System.nanoTime();
    int hits=0; for (int c=0;c<K;c++) hits+=h.getInstances(cls("C"+c),true).getFlattened().size(); long t2=System.nanoTime();
    System.out.printf("  "+mode+" k="+K+" %s n=%-5d axioms=%-6d consistent=%s in %d ms; instances of the 20 classes %d (want %d) in %d ms%n", key?"HasKey":"no key", n, o.getAxiomCount(), ok, (t1-t0)/1000000, hits, n, (t2-t1)/1000000);
  }
}
