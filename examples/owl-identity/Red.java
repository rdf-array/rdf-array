import org.semanticweb.owlapi.apibinding.OWLManager; import org.semanticweb.owlapi.io.*; import org.semanticweb.owlapi.model.*; import org.semanticweb.owlapi.profiles.*; import org.semanticweb.HermiT.ReasonerFactory; import java.util.*;
public class Red {
  static final String E="http://example/";
  static final String PRE="@prefix ex: <"+E+"> .\n@prefix owl: <http://www.w3.org/2002/07/owl#> .\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n";
  static final String TBOX="ex:rgb a owl:ObjectProperty .\nex:RedThing a owl:Class ; owl:equivalentClass [ a owl:Restriction ; owl:onProperty ex:rgb ; owl:hasValue %s ] .\n";
  static final String ABOX="ex:rgb a owl:ObjectProperty .\nex:x a owl:NamedIndividual ; ex:rgb %s .\n";
  static void run(String name, String t, String abox, boolean separate) throws Exception {
    System.out.println("=== "+name);
    OWLOntologyManager man=OWLManager.createOWLOntologyManager(); OWLDataFactory df=man.getOWLDataFactory();
    OWLOntology o1, o2=null, all;
    if (separate) {
      o1=man.loadOntologyFromOntologyDocument(new StringDocumentSource(PRE+t, IRI.create("http://example/doc1"), new org.semanticweb.owlapi.formats.TurtleDocumentFormat(), null));
      o2=man.loadOntologyFromOntologyDocument(new StringDocumentSource(PRE+abox, IRI.create("http://example/doc2"), new org.semanticweb.owlapi.formats.TurtleDocumentFormat(), null));
      all=man.createOntology(IRI.create(E+"all")); man.addAxioms(all, o1.getAxioms()); man.addAxioms(all, o2.getAxioms());
    } else { o1=man.loadOntologyFromOntologyDocument(new StringDocumentSource(PRE+t+abox)); all=o1; }
    for (OWLOntology o: separate? List.of(o1,o2): List.of(o1)) {
      var md=man.getOntologyFormat(o).getOntologyLoaderMetaData();
      if (md instanceof RDFParserMetaData rm) System.out.println("  unparsed triples: "+rm.getUnparsedTriples().size());
    }
    for (OWLAxiom a: all.getAxioms()) System.out.println("  ax: "+a.toString().replace(E,"ex:"));
    System.out.println("  OWL 2 DL: "+new OWL2DLProfile().checkOntology(all).isInProfile());
    var h=new ReasonerFactory().createReasoner(all);
    System.out.println("  consistent="+h.isConsistent()+"  x a RedThing entailed="+h.isEntailed(df.getOWLClassAssertionAxiom(df.getOWLClass(IRI.create(E+"RedThing")), df.getOWLNamedIndividual(IRI.create(E+"x")))));
  }
  public static void main(String[] a) throws Exception {
    String L="( 255 0 0 )";
    run("ladder list, two documents", String.format(TBOX,L), String.format(ABOX,L), true);
    run("ladder list, one document", String.format(TBOX,L), String.format(ABOX,L), false);
    run("control: named individual ex:red", String.format(TBOX,"ex:red"), String.format(ABOX,"ex:red"), true);
  }
}
