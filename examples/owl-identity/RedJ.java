import org.apache.jena.ontology.*; import org.apache.jena.rdf.model.*; import org.apache.jena.riot.*; import org.apache.jena.vocabulary.*;
public class RedJ { public static void main(String[] a){
  org.apache.jena.sys.JenaSystem.init();
  String PRE="@prefix ex: <http://example/> .\n@prefix owl: <http://www.w3.org/2002/07/owl#> .\n";
  for (String v: new String[]{"( 255 0 0 )","ex:red"}) {
   Model b=ModelFactory.createDefaultModel();
   RDFParser.fromString(PRE+"ex:rgb a owl:ObjectProperty . ex:RedThing a owl:Class ; owl:equivalentClass [ a owl:Restriction ; owl:onProperty ex:rgb ; owl:hasValue "+v+" ] .").lang(Lang.TURTLE).parse(b);
   RDFParser.fromString(PRE+"ex:x ex:rgb "+v+" .").lang(Lang.TURTLE).parse(b);
   for (OntModelSpec s: new OntModelSpec[]{OntModelSpec.OWL_MEM_RULE_INF, OntModelSpec.OWL_MEM_MICRO_RULE_INF}) {
     Model m=ModelFactory.createOntologyModel(s,b);
     System.out.println("Jena "+(s==OntModelSpec.OWL_MEM_RULE_INF?"OWL full rules":"OWL micro")+", value "+v+": x a RedThing = "+m.contains(m.createResource("http://example/x"),RDF.type,m.createResource("http://example/RedThing")));
   }}
}}
