/* Redlines of the SPARQL 1.2 Query Language (W3C Working Draft, 2026-11-19) for the rdf-array project.
 *
 * A redline page holds only its changes. When it is opened, redline() fetches the draft
 * from w3.org (w3.org allows the request), moves its body into the page and applies the changes to
 * it in the reader's browser, so the W3C text shown is the published one. Each change is one call
 * of the helpers below; a change of the layer under review is marked, new text as <ins class="ra">
 * and removed text as <del class="ra">, and listed in the banner. A layer accepted earlier (the
 * SPARQL-array changes under the rdf-undef redline) is applied first with the class "acc", unmarked
 * unless body.ra-show-acc is set.
 *
 *   redline({ layers: [ { changes: SPARQL_ARRAY, mark: false }, { changes: myChanges, mark: true } ] })
 *
 * This is owl-direct-semantics.js for a ReSpec document: a section is <section id="…"> holding
 * its heading, its content and its subsections, and a grammar rule is a table row whose name
 * carries id="r<Name>". A changes function receives the helpers bound to its layer:
 *   sectionEl(id)                    the <section> element
 *   section(id)                      its own elements: the children that are neither the heading nor a subsection
 *   find(id, selector, text)         the innermost element of the section (subsections included) matching both
 *   lastOf(id, selector)             the last own element of the section that matches
 *   edit(el, text, html, label, delPart, before)
 *                                    after the first occurrence of `text` in el (before it, with
 *                                    `before`), insert `html`; `delPart`, a suffix of `text`, is marked removed
 *   remove(el, label)                mark the whole content of an element removed
 *   block(ref, 'before'|'after', html, label, example)   a new <div>, an example when `example`
 *   li(ref, html, label)             a new list item after `ref`
 *   row(ref, cells, label)           a new table row after `ref`, cells an array of HTML strings
 *   rule(name)                       the body of the grammar rule `name`
 *   ruleAppend(name, html, label)    one more alternative at the end of a rule
 *   ruleReplace(name, html, label)   the rule's body removed and `html` in its place
 *   ruleRow(after, num, name, html, label)   a new rule after the rule `after`, with id r<name>
 *   insAfter(node, html, label)      a new <ins> right after a node
 *   splice(textNode, start, length, html, label)   mark `length` characters of a text node removed and insert `html` after them
 *   INS(html), I(s), CODE(s)         '<ins class="…">html</ins>', italics, <code>
 */
(function () {
  var SRC = 'https://www.w3.org/TR/2026/WD-sparql12-query-20261119/';   // the Working Draft of 2026-11-19, pinned so that the anchors hold
  var TITLE = 'SPARQL 1.2 Query Language';

  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }

  function helpers(doc, cls, marked, list, counter) {
    var h = {};
    function mark(el, label) {
      if (!marked) return el;
      counter.n++; el.id = 'ra-' + counter.n;
      var li = document.createElement('li'); li.innerHTML = '<a href="#ra-' + counter.n + '">' + label + '</a>'; list.appendChild(li);
      return el;
    }
    function insEl(html) { var ins = document.createElement('ins'); ins.className = cls; ins.innerHTML = html; return ins; }
    h.INS = function (html) { return '<ins class="' + cls + '">' + html + '</ins>'; };
    h.I = function (s) { return '<i>' + s + '</i>'; };
    h.CODE = function (s) { return '<code>' + s + '</code>'; };
    h.sectionEl = function (id) {
      var s = doc.querySelector('[id="' + id + '"]');
      if (!s) throw new Error('no section ' + id);
      return s;
    };
    h.section = function (id) {
      return [].filter.call(h.sectionEl(id).children, function (e) { return e.tagName !== 'SECTION' && !e.classList.contains('header-wrapper'); });
    };
    h.find = function (id, selector, text) {
      var cands = [].slice.call(h.sectionEl(id).querySelectorAll(selector)), hit = null;
      // The innermost match: a nested list item rather than the item that holds its list.
      for (var j = 0; j < cands.length; j++)
        if (!text || norm(cands[j].textContent).indexOf(text) >= 0) { if (!hit || hit.contains(cands[j])) hit = cands[j]; else if (!cands[j].contains(hit)) break; }
      if (hit) return hit;
      throw new Error('not found in ' + id + ': ' + selector + ' "' + text + '"');
    };
    h.lastOf = function (id, selector) {
      var els = h.section(id).filter(function (e) { return e.matches(selector); });
      if (!els.length) throw new Error('not found in ' + id + ': ' + selector);
      return els[els.length - 1];
    };
    // In the text node `node`, mark the `length` characters at `start` removed (none when 0) and put the new HTML after them.
    h.splice = function (node, start, length, insHtml, label) {
      var parent = node.parentNode, tail = node.splitText(start + length), ins = insEl(insHtml);
      if (length) {
        var old = node.splitText(start);
        var del = document.createElement('del'); del.className = cls; parent.replaceChild(del, old); del.appendChild(old);
      }
      parent.insertBefore(ins, tail);
      return mark(ins, label);
    };
    h.edit = function (el, text, insHtml, label, delPart, before) {
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), node;
      while ((node = walker.nextNode())) {
        var k = node.data.replace(/ /g, ' ').indexOf(text);
        if (k < 0) continue;
        if (before) return h.splice(node, k, 0, insHtml, label);
        var n = delPart ? delPart.length : 0;
        return h.splice(node, k + text.length - n, n, insHtml, label);
      }
      throw new Error('text not found: ' + text);
    };
    h.remove = function (el, label) {
      var inline = /^(A|SPAN|CODE|VAR|I|B|EM|STRONG)$/.test(el.tagName);   // an inline element stays inline
      var del = document.createElement('del'); del.className = cls + (inline ? '' : ' ' + cls + '-block');
      while (el.firstChild) del.appendChild(el.firstChild);
      el.appendChild(del);
      return mark(del, label);
    };
    h.insAfter = function (node, html, label) {
      var ins = insEl(html); node.parentNode.insertBefore(ins, node.nextSibling); return mark(ins, label);
    };
    h.block = function (ref, where, html, label, example) {
      var d = document.createElement('div'); d.className = cls + '-ins' + (example ? ' example' : ''); d.innerHTML = html;
      ref.parentNode.insertBefore(d, where === 'before' ? ref : ref.nextSibling);
      return mark(d, label);
    };
    h.li = function (ref, html, label) {
      var l = document.createElement('li'); l.className = cls + '-ins'; l.innerHTML = h.INS(html);
      ref.parentNode.insertBefore(l, ref.nextSibling);
      return mark(l, label);
    };
    h.row = function (ref, cells, label) {
      var tr = document.createElement('tr'); tr.className = cls + '-ins';
      tr.innerHTML = cells.map(function (c) { return '<td>' + h.INS(c) + '</td>'; }).join('');
      ref.parentNode.insertBefore(tr, ref.nextSibling);
      return mark(tr, label);
    };
    h.rule = function (name) {
      var el = doc.querySelector('[id="r' + name + '"]');
      if (!el) throw new Error('no grammar rule ' + name);
      return el.closest('tr').querySelector('.gRuleBody');
    };
    h.ruleAppend = function (name, html, label) {
      var body = h.rule(name), ins = insEl(' | ' + html); body.appendChild(ins); return mark(ins, label);
    };
    h.ruleReplace = function (name, html, label) {
      var body = h.rule(name), del = document.createElement('del'); del.className = cls;
      while (body.firstChild) del.appendChild(body.firstChild);
      body.appendChild(del);
      var ins = insEl(' ' + html); body.appendChild(ins); return mark(ins, label);
    };
    h.ruleRow = function (after, num, name, html, label) {
      var ref = doc.querySelector('[id="r' + after + '"]').closest('tr');
      var tr = document.createElement('tr'); tr.className = cls + '-ins';
      tr.innerHTML = '<td>' + h.INS('<code>[' + num + ']&nbsp;&nbsp;</code>') + '</td><td>' + h.INS('<code><span class="doc-ref" id="r' + name + '">' + name + '</span></code>') +
        '</td><td>&nbsp;&nbsp;::=&nbsp;&nbsp;</td><td>' + h.INS('<code class="gRuleBody">' + html + '</code>') + '</td>';
      ref.parentNode.insertBefore(tr, ref.nextSibling);
      return mark(tr, label);
    };
    return h;
  }

  // Grammar spellings: a token, a nonterminal.
  function T(s) { return '<span class="token">' + s + '</span>'; }
  function N(s) { return '<a href="#r' + s + '">' + s + '</a>'; }

  // SPARQL-array: the sequence term in patterns, templates and expressions. The design is
  // rdf-array.md ("What changes": the data model and SPARQL-array) and array-syntax.md §1.
  function SPARQL_ARRAY(h) {
    var find = h.find, edit = h.edit, block = h.block, li = h.li, row = h.row, lastOf = h.lastOf, CODE = h.CODE;
    var DATA = '<pre class="nohighlight">PREFIX : &lt;http://example/&gt;\n' +
      ':alice :scores ( 7 9 8 ) .\n:bob   :scores ( 7 9 8 ) .\n:m     :rows   ( ( 1 2 ) ( 3 4 ) ) .\n' +
      ':obs   :coding ( ( "8480-6" "Systolic" ( 120 "mm[Hg]" ) ) ( "8462-4" "Diastolic" ( 80 "mm[Hg]" ) ) ) .</pre>';

    // 1 Introduction: what rdf-array adds, and the data the examples use.
    block(lastOf('introduction', 'p'), 'after',
      '<p><b>SPARQL-array.</b> rdf-array is RDF with one more kind of term, the <b>sequence</b>: ' + CODE('( 1 2 3 )') + ' in Turtle-array is one term ' +
      'holding three literals in order, ' + CODE('()') + ' is the empty sequence, and a sequence may hold terms of any kind, sequences included. ' +
      'A sequence may be the object of a triple or an element of a sequence; it may not be a subject, a predicate or a graph name. Each sequence written is ' +
      'an <b>occurrence</b> of its own, in exactly one triple: ' + CODE(':alice :scores ( 7 9 8 ) . :bob :scores ( 7 9 8 ) .') + ' holds two sequences, ' +
      'equal and still two. Two sequences are <b>equal</b> when their elements are equal, pairwise. ' +
      CODE('rdf:first') + ', ' + CODE('rdf:rest') + ' and ' + CODE('rdf:nil') + ' are ordinary IRIs with no special meaning; the collection syntax no longer spells them. ' +
      'This redline marks what the sequence term changes in SPARQL: the syntax (§4.1, §4.2.3, §19.7), a pattern over a sequence (§4.2.3, §18.1.3, §18.4.1), ' +
      '<code>UNNEST</code> (§10.3, §18.2, §18.6), ordering and duplicates (§15.1, §15.3), <code>CONSTRUCT</code> (§16.2) and the expressions over sequences (§17.3, §17.4.1.8, §17.4.8). ' +
      'The examples use this data:</p>' + DATA,
      '1 Introduction: the sequence term', true);

    // 4.1 RDF Term Syntax: a subsection for sequences, after 4.1.4.
    block(h.sectionEl('QSynBlankNodes'), 'after',
      '<h4>4.1.5 Syntax for Sequences</h4>' +
      '<p>A sequence is written ' + CODE('( e<sub>1</sub> e<sub>2</sub> … )') + ': the elements in order, separated by white space, between parentheses, ' +
      'and ' + CODE('()') + ' is the empty sequence. An element is an IRI, a literal, a blank node, a triple term, a variable or a sequence: ' +
      CODE('( 1 ?x ( 2 3 ) &lt;&lt;( :s :p :o )&gt;&gt; )') + '. In a triple pattern a sequence stands as the object; a sequence in the subject position matches no triple, ' +
      'as a literal there does not, and a template triple with a sequence as subject is dropped as an illegal RDF construct (§16.2). ' +
      'In a pattern a sequence is a <b>sequence pattern</b> (§4.2.3), whose elements may also be the gap ' + CODE('...') + ' and the named gap ' + CODE('...?rest') + '; ' +
      'in a template, in ' + CODE('VALUES') + ' and in an expression it is a term.</p>',
      '4.1.5 Syntax for Sequences');

    // 4.2.3 RDF Collections: one term, no triples; sequence patterns.
    var col = h.section('collections');
    edit(col[0], 'using the syntax "(element1 element2 ...)"', '; under rdf-array such a collection is one RDF term, a sequence, and allocates no triples and no blank nodes',
      '4.2.3: a collection is one term');
    var gone = document.createElement('div');   // the expansion into triples, struck as one change
    col[0].parentNode.insertBefore(gone, col[1]);
    for (var i = 1; i < col.length; i++) gone.appendChild(col[i]);
    h.remove(gone, '4.2.3: the expansion into rdf:first/rdf:rest triples goes');
    block(gone, 'after',
      '<p>' + CODE('()') + ' is the empty sequence, not ' + CODE('rdf:nil') + '. A collection in a triple pattern is a <b>sequence pattern</b>: it matches a sequence of ' +
      'the same length, element by element. A constant element matches an equal element, a variable is bound to the element at its position, and a nested collection ' +
      'is a nested pattern. The same variable twice must match equal elements.</p>' +
      '<pre class="query nohighlight">SELECT ?x ?o WHERE { ?s :scores ( ?x 9 ?o ) }      # ?x 7 and ?o 8, once for :alice and once for :bob\nSELECT ?s    WHERE { ?s :rows ( ( 1 2 ) ?r ) }      # ?r is the sequence ( 3 4 )\nSELECT ?s    WHERE { ?s :p () }                     # the empty sequence is a term</pre>' +
      '<p>The <b>gap</b> ' + CODE('...') + ' matches zero or more consecutive elements, so ' + CODE('( ?first ... )') + ', ' + CODE('( ... ?last )') + ' and ' +
      CODE('( ... ?x ... )') + ' find the first element, the last element and every element, one solution per way the gaps can be placed. A pattern may hold several gaps, and gaps may ' +
      'nest: ' + CODE('( ... ( "8480-6" ?name ( ?v ?unit ) ) ... )') + ' finds a triple of that shape anywhere in a list of triples. A <b>named gap</b> ' + CODE('...?rest') +
      ' matches like a gap and binds its variable to the run it matched, as a new sequence: ' + CODE('( ?head ...?tail )') + ' takes a list apart, and ' +
      CODE('( ...?before ?x ... )') + ' gives the position of ' + CODE('?x') + ' as ' + CODE('SEQLEN(?before) + 1') + '. The token is ' + CODE('...') +
      ' followed by the variable with no space: ' + CODE('( ?a ... ?b )') + ' is a gap and then an element, ' + CODE('( ?a ...?b )') + ' a named gap.</p>' +
      '<pre class="query nohighlight">SELECT ?s ?x    WHERE { ?s :scores ( ... ?x ... ) }   # three solutions per subject: 7, 9, 8\nSELECT ?h ?t    WHERE { :alice :scores ( ?h ...?t ) }  # ?h 7, ?t ( 9 8 )\nSELECT ?name ?v WHERE { :obs :coding ( ... ( "8480-6" ?name ( ?v ?unit ) ) ... ) }   # "Systolic", 120</pre>' +
      '<p>A collection in a ' + CODE('CONSTRUCT') + ' template or in ' + CODE('INSERT DATA') + ' builds a sequence rather than matching one, so it has no gap: ' +
      CODE('CONSTRUCT { ?s :p ( ?a ... ) }') + ' is a syntax error.</p>',
      '4.2.3: sequence patterns, gaps and named gaps');

    // 10.3 UNNEST, after 10.2 VALUES.
    block(h.sectionEl('inline-data'), 'after',
      '<h3>10.3 UNNEST: Walking a Sequence</h3>' +
      '<p>' + CODE('UNNEST( expr AS ?x AT ?i )') + ' yields one solution per element of the sequence that ' + CODE('expr') + ' evaluates to, binding ' + CODE('?x') +
      ' to the element and ' + CODE('?i') + ' to its position, counting from 1 (' + CODE('AT ?i') + ' may be left out). Like ' + CODE('BIND') + ', ' + CODE('UNNEST') +
      ' ends the preceding basic graph pattern, and its variables must not have been used in the group graph pattern up to that point. When ' + CODE('expr') +
      ' is unbound, an error, or not a sequence, the solution has no element to walk and yields nothing. Counting from 1 is what ' + CODE('SUBSTR') +
      ' already does, after XPath, and what the container vocabulary does with ' + CODE('rdf:_1') + '.</p>' +
      '<pre class="query nohighlight">SELECT ?s ?i ?v   WHERE { ?s :scores ?l . UNNEST(?l AS ?v AT ?i) }          # (:alice 1 7) (:alice 2 9) (:alice 3 8) and the same for :bob\nSELECT ?i ?j ?c   WHERE { :m :rows ?r . UNNEST(?r AS ?row AT ?i) UNNEST(?row AS ?c AT ?j) }   # the four cells of the matrix\nSELECT ?code ?v   WHERE { :obs :coding ?l . UNNEST(?l AS ?t) BIND(?t[1] AS ?code) BIND(?t[3][1] AS ?v) }   # one field of each tuple</pre>' +
      '<p>Whether an application wants a sequence or repeated properties is a question about the RDF, answered by an update: ' +
      CODE('DELETE { ?s :tags ?seq } INSERT { ?s :tags ?tag } WHERE { ?s :tags ?seq . UNNEST(?seq AS ?tag) }') + ' spreads a sequence into repeated properties.</p>',
      '10.3 UNNEST');

    // 15.1 ORDER BY: where sequences sort.
    li(find('modOrderBy', 'li', 'Triple terms'),
      'Sequences. Two sequences are ordered element by element by this same order and by "&lt;"; when one is a prefix of the other, the shorter comes first.',
      '15.1 ORDER BY: sequences, element by element');

    // 15.3 Duplicate solutions: DISTINCT and GROUP BY compare by equality.
    block(lastOf('modDuplicates', 'p'), 'after',
      '<p>Two sequences are the same solution for ' + CODE('DISTINCT') + ', ' + CODE('REDUCED') + ' and ' + CODE('GROUP BY') + ' (§11.2) when they are equal, element by element: ' +
      'the two occurrences of ' + CODE('( 7 9 8 )') + ' in the example data are one value of ' + CODE('?l') + ' in ' + CODE('SELECT DISTINCT ?l { ?s :scores ?l }') +
      '. A result has no way to show which occurrence a row holds, so a row that ' + CODE('DISTINCT') + ' keeps stands for every occurrence it merged; a join after it reaches only one. ' +
      'This is an open question of the design (<a href="https://rdf-array.github.io/rdf-array/docs/rdf-array.html#distinct-and-group-by-under-joins-by-occurrence">rdf-array.md</a>).</p>',
      '15.3: DISTINCT and GROUP BY compare sequences by equality');

    // 16.2 CONSTRUCT: every instantiation adds an occurrence; no sequence subjects.
    var cons = h.section('construct');
    edit(cons[0], 'by set union', ', except that a triple whose object is a sequence is added once per instantiation: each sequence written is an occurrence of its own, in exactly one triple, so ' +
      CODE('CONSTRUCT { ?s :q ?l ; :r ?l } WHERE { ?s :scores ?l }') + ' builds two occurrences per solution',
      '16.2 CONSTRUCT: an occurrence per instantiation');
    edit(cons[1], 'such as a literal in subject or predicate position', ' or a sequence in subject position', '16.2 CONSTRUCT: no sequence subjects');

    // 17.3 Operator mapping: =, < and IN over sequences.
    var eq = find('OperatorMapping', 'tr', 'A = B RDF term RDF term');
    row(eq, ['A = B', 'sequence', 'sequence', 'seq-equal(A, B)', 'xsd:boolean'], '17.3: = on sequences');
    row(eq.nextElementSibling, ['A != B', 'sequence', 'sequence', 'fn:not(seq-equal(A, B))', 'xsd:boolean'], '17.3: != on sequences');
    row(eq.nextElementSibling.nextElementSibling, ['A &lt; B', 'sequence', 'sequence', 'seq-less-than(A, B)', 'xsd:boolean'], '17.3: &lt; on sequences (and &gt;, &lt;=, &gt;= as for the other types)');
    row(eq.nextElementSibling.nextElementSibling.nextElementSibling, ['A IN B', 'RDF term', 'sequence', 'seq-contains(B, A)', 'xsd:boolean'], '17.3: IN with a sequence');

    // 17.4.1.8 IN: the sequence form.
    block(lastOf('func-in', '*'), 'after',
      '<pre class="prototype nohighlight"><span class="return">boolean</span>  rdfTerm <span class="operator">IN</span> sequence</pre>' +
      '<p>When the right-hand side is a sequence (a variable, a ' + CODE('SEQ') + ' call or an indexed one of these: ' + N('SeqRef') + ' in the grammar), ' +
      CODE('IN') + ' is true when some element of the sequence equals the term, by "=", and false when none does; the term may itself be a sequence. ' +
      CODE('?x IN ( … )') + ' keeps its meaning, a list of expressions, so ' + CODE('?x IN (?seq)') + ' asks whether ' + CODE('?x') + ' equals ' + CODE('?seq') +
      ', not whether it is an element.</p>' +
      '<pre class="nohighlight">9 IN ?l                         true   where ?l is ( 7 9 8 )\nSEQ(3, 4) IN ?r                 true   where ?r is ( ( 1 2 ) ( 3 4 ) )\n3 IN ?r                         false  3 is not an element of ?r, only of an element\n2 IN (?r)                       false  the list form: is 2 equal to ?r</pre>',
      '17.4.1.8 IN: rdfTerm IN sequence');

    // 17.4.8 Functions on Sequences, after 17.4.7.
    block(h.sectionEl('func-hash'), 'after',
      '<h4>17.4.8 Functions on Sequences</h4>' +
      '<p>A sequence is an RDF term of its own kind: ' + CODE('isIRI') + ', ' + CODE('isBLANK') + ', ' + CODE('isLITERAL') + ' and ' + CODE('isTRIPLE') + ' are false for it, ' +
      CODE('sameTerm') + ' is true of one occurrence and itself, and ' + CODE('STR') + ' gives its spelling ' + CODE('(e<sub>1</sub> e<sub>2</sub> …)') + ' with each element in N-Triples spelling.</p>' +
      '<pre class="prototype nohighlight"><span class="return">xsd:boolean</span>  <span class="operator">isSEQ</span> (RDF term term)</pre><p>True when the argument is a sequence, false for any other RDF term.</p>' +
      '<pre class="prototype nohighlight"><span class="return">xsd:integer</span>  <span class="operator">SEQLEN</span> (sequence s)</pre><p>The number of elements of ' + CODE('s') + '; an error when ' + CODE('s') + ' is not a sequence.</p>' +
      '<pre class="prototype nohighlight"><span class="return">sequence</span>  <span class="operator">SEQ</span> (expression<sub>1</sub>, …, expression<sub>n</sub>)</pre><p>The sequence of the values of the arguments, in order; ' + CODE('SEQ()') + ' is the empty sequence. An error in an argument is the error of the whole.</p>' +
      '<pre class="prototype nohighlight"><span class="return">RDF term</span>  sequence<span class="operator">[</span>xsd:integer i<span class="operator">]</span></pre><p>The <i>i</i>-th element, counting from 1; indexes chain, ' + CODE('?rows[2][3]') + '. An index out of range, or applied to anything but a sequence, is an error, so a ' + CODE('BIND') + ' leaves its variable unbound.</p>' +
      '<pre class="prototype nohighlight"><span class="return">sequence</span>  sequence<span class="operator">[</span>xsd:integer m <span class="operator">...</span> xsd:integer n<span class="operator">]</span></pre><p>The elements <i>m</i> to <i>n</i>, both included, as a new sequence; either end may be left out: ' + CODE('?pts[2...]') + ' is everything after the first, ' + CODE('?pts[...n]') + ' the first <i>n</i>. The range is clamped to the sequence, so ' + CODE('SEQ(4, 5)[2...3]') + ' is ' + CODE('(5)') + ' and ' + CODE('SEQ()[2...]') + ' is ' + CODE('()') + '. The ends are expressions: ' + CODE('?s[SEQLEN(?s) - 1 ... SEQLEN(?s)]') + ' is the last two.</p>' +
      '<pre class="prototype nohighlight"><span class="return">xsd:boolean</span>  <span class="operator">seq-equal</span> (sequence a, sequence b)</pre><p>True when <i>a</i> and <i>b</i> have the same length and, at each position, elements that are equal: sequences by this function, triple terms and literals by "=" as the operator mapping defines it, other terms by ' + CODE('sameTerm') + '. "=" on two sequences is this function, and so is the test a constant sequence in a pattern makes.</p>' +
      '<pre class="prototype nohighlight"><span class="return">xsd:boolean</span>  <span class="operator">seq-less-than</span> (sequence a, sequence b)</pre><p>True when, at the first position where <i>a</i> and <i>b</i> differ, <i>a</i>\'s element is lower by the order of §15.1 and "&lt;", or when <i>a</i> is a proper prefix of <i>b</i>. "&lt;" on two sequences is this function; an error where the elements are not ordered.</p>' +
      '<pre class="prototype nohighlight"><span class="return">xsd:boolean</span>  <span class="operator">seq-contains</span> (sequence s, RDF term t)</pre><p>True when some element of <i>s</i> equals <i>t</i> by "=", as §17.4.1.8 says for ' + CODE('t IN s') + '.</p>' +
      '<p>In ' + CODE('ORDER BY') + ' and ' + CODE('GROUP BY') + ' an index needs brackets, ' + CODE('ORDER BY (?x[1])') + ', since a bare ' + CODE('?x') + ' there is a variable and not an expression.</p>',
      '17.4.8 Functions on Sequences');

    // 18.1.1: the graph and the terms.
    block(lastOf('sparqlDataset', '*'), 'after',
      '<p><b>Terms and graphs under rdf-array.</b> The set <i>T</i> of RDF terms holds the sequences beside IRIs, blank nodes, literals and triple terms. An RDF graph is a set of triples, ' +
      'except that a triple whose object is a sequence may occur more than once: each sequence is an occurrence of its own and is in exactly one triple, so two occurrences of a triple ' +
      'differ only in being two, and an implementation may keep a count of them. Two sequences are equal when their elements are equal, pairwise (seq-equal, §17.4.8).</p>',
      '18.1.1: terms and graphs under rdf-array');

    // 18.1.3 Triple patterns: the sequence pattern.
    block(lastOf('sparqlTriplePatterns', 'div.defn'), 'after',
      '<div class="defn"><p><b>Definition: Sequence Pattern</b></p>' +
      '<p>A sequence pattern is ' + CODE('( m<sub>1</sub> … m<sub>n</sub> )') + ', <i>n</i> ≥ 0, where each <i>m<sub>i</sub></i> is an RDF term, a variable, a triple pattern, a sequence pattern, ' +
      'the gap ' + CODE('...') + ' or a named gap ' + CODE('...v') + ' with <i>v</i> a variable. A sequence pattern may stand where the definition of a triple pattern allows an RDF term in the object position.</p></div>' +
      '<p>A sequence pattern in the subject position fails to match on any RDF graph, since a sequence may not be a subject.</p>',
      '18.1.3: Definition: Sequence Pattern');

    // 18.1.6 Solution mappings: a sequence from the data is its occurrence.
    block(lastOf('sparqlSolutions', 'div.defn'), 'after',
      '<p><b>Occurrences in solution mappings.</b> When basic graph pattern matching (§18.4.1) binds a variable to a sequence of the active graph, the mapping records the occurrence matched, ' +
      'and two mappings are compatible on that variable only when they hold the same occurrence: ' + CODE('?x :scores ?l . ?y :scores ?l') + ' does not join ' + CODE(':alice') + ' with ' +
      CODE(':bob') + ' over the example data, though their sequences are equal. A sequence that comes from an expression, from ' + CODE('VALUES') + ' or from a constant in the query is one ' +
      'value, compared by equality: ' + CODE('VALUES ?l { ( 7 9 8 ) } ?x :scores ?l') + ' matches both.</p>',
      '18.1.6: occurrences in solution mappings');

    // 18.4.1 BGP matching: matching a sequence pattern.
    block(lastOf('BGPsparql', 'div.defn'), 'after',
      '<div class="defn"><p><b>Definition: Matching a Sequence Pattern</b></p>' +
      '<p>A sequence pattern <i>P</i> = ' + CODE('( m<sub>1</sub> … m<sub>n</sub> )') + ' <b>matches</b> a sequence <i>s</i> = ' + CODE('( e<sub>1</sub> … e<sub>k</sub> )') +
      ' under a solution mapping <i>μ</i> when the elements of <i>P</i>, with each gap replaced by zero or more consecutive elements of <i>s</i>, line up with <i>e<sub>1</sub> … e<sub>k</sub></i> so that, at each position:</p><ul>' +
      '<li>an RDF term <i>m<sub>i</sub></i> is equal to the element there (seq-equal for a sequence, "=" for a literal or a triple term, ' + CODE('sameTerm') + ' otherwise);</li>' +
      '<li>a variable <i>v</i> is mapped by <i>μ</i> to the element there (to its occurrence, when it is a sequence);</li>' +
      '<li>a sequence pattern or a triple pattern matches the element there, recursively;</li>' +
      '<li>a named gap ' + CODE('...v') + ' has <i>v</i> mapped by <i>μ</i> to the run it replaced, as a new sequence of those elements.</li></ul>' +
      '<p>The same variable at two positions maps to one element, so both elements are equal. In the Definition of Evaluation of a Basic Graph Pattern, <i>μ</i>(<i>BGP</i>) ⊆ <i>G</i> is read with this definition ' +
      'for the sequence patterns in object positions, and <i>μ</i> is a solution once per way the gaps of its sequence patterns can be placed: ' +
      'multiplicity(<i>μ</i> | Ω) is the number of such ways, over the triples of <i>G</i> that <i>μ</i>(<i>BGP</i>) matches. So ' + CODE('?s :scores ( ... ?x ... )') +
      ' has three solutions per subject over the example data, one per element, and ' + CODE('( ... ?x ... )') + ' over ' + CODE('( 7 7 )') + ' has the solution ' + CODE('?x = 7') + ' with multiplicity 2, as ' + CODE('UNNEST') + ' gives two rows.</p></div>',
      '18.4.1: Definition: Matching a Sequence Pattern');

    // 18.2 Algebraic syntax: Unnest.
    li(find('algebraicSyntax', 'li', 'Extend(A, var, expr)'),
      '<a class="absOp">Unnest</a>(<var>A</var>, <var>expr</var>, <var>var</var>, <var>pos</var>) is an algebraic query expression if <var>A</var> is an algebraic query expression, ' +
      '<var>expr</var> is an expression, <var>var</var> is a variable and <var>pos</var> is a variable or absent.',
      '18.2: Unnest');

    // 18.3.2.7 Translation: UNNEST beside BIND.
    // The steps are one <pre>; the UNNEST step goes after the "End" that closes the BIND step.
    var steps = find('sparqlTranslateGraphPatterns', 'pre', 'is of the form BIND'), walker = document.createTreeWalker(steps, NodeFilter.SHOW_TEXT), tn, seen = false;
    while ((tn = walker.nextNode())) {
      if (tn.data.indexOf('is of the form BIND') >= 0) seen = true;
      else if (seen && tn.data.indexOf('End') >= 0) {
        h.splice(tn, tn.data.indexOf('End') + 3, 0, '\n\n   If <var>E</var> is of the form UNNEST(<var>expr</var> AS <var>var</var> AT <var>pos</var>)\n' +
          '      <var>G</var> := <a class="absOp">Unnest</a>(<var>G</var>, <var>expr</var>, <var>var</var>, <var>pos</var>)\n   End', '18.3.2.7: translating UNNEST');
        break;
      }
    }

    // 18.6 Algebra: the Unnest operator, and its evaluation.
    block(find('sparqlAlgebra', 'div.defn', 'Definition: Extend'), 'after',
      '<div class="defn"><p><b>Definition: Unnest</b></p>' +
      '<p>Let Ω be a multiset of solution mappings, <var>expr</var> an expression, <var>var</var> and <var>pos</var> variables, <var>D</var> a dataset and <var>G</var> the active graph. We define:</p>' +
      '<p>Unnest(Ω, <var>expr</var>, <var>var</var>, <var>pos</var>, <var>D</var>, <var>G</var>) = { merge(<var>μ</var>, { (<var>var</var>, <var>e<sub>k</sub></var>), (<var>pos</var>, <var>k</var>) }) | ' +
      '<var>μ</var> in Ω, <var>expr</var>(<var>μ</var>, <var>D</var>, <var>G</var>) is a sequence ( <var>e<sub>1</sub></var> … <var>e<sub>n</sub></var> ), 1 ≤ <var>k</var> ≤ <var>n</var> }, ' +
      'with (<var>pos</var>, <var>k</var>) left out when <var>pos</var> is absent, and <var>k</var> an xsd:integer.</p>' +
      '<p>multiplicity(<var>μ\'</var> | Unnest(Ω, …)) = for each <var>μ</var> in Ω and <var>k</var> such that <var>μ\'</var> = merge(<var>μ</var>, { (<var>var</var>, <var>e<sub>k</sub></var>), (<var>pos</var>, <var>k</var>) }), sum of multiplicity(<var>μ</var> | Ω).</p>' +
      '<p>A <var>μ</var> for which <var>expr</var> evaluates to an error or to a term that is not a sequence contributes nothing.</p></div>',
      '18.6: Definition: Unnest');
    block(find('sparqlAlgebraEval', 'div.defn', 'Evaluation of Extend'), 'after',
      '<div class="defn"><p><b>Definition: Evaluation of Unnest</b></p>' +
      '<p>eval(<var>D</var>(<var>G</var>), Unnest(<var>A</var>, <var>expr</var>, <var>var</var>, <var>pos</var>), <var>μ<sub>ctx</sub></var>) = ' +
      'Unnest(eval(<var>D</var>(<var>G</var>), <var>A</var>, <var>μ<sub>ctx</sub></var>), <var>expr</var>, <var>var</var>, <var>pos</var>, <var>D</var>, <var>G</var>)</p></div>',
      '18.6.2: Evaluation of Unnest');

    // 19.7 Grammar.
    h.ruleAppend('GraphPatternNotTriples', N('Unnest'), '19.7 [60]: Unnest');
    h.ruleRow('Bind', '64a', 'Unnest', T("'UNNEST'") + ' ' + T("'('") + ' ' + N('Expression') + ' ' + T("'AS'") + ' ' + N('Var') + ' ( ' + T("'AT'") + ' ' + N('Var') + ' )? ' + T("')'"), '19.7 [64a]: Unnest');
    h.ruleReplace('CollectionPath', T("'('") + ' ' + N('SeqMemberPath') + '+ ' + T("')'"), '19.7 [108]: CollectionPath over SeqMemberPath');
    h.ruleRow('CollectionPath', '108a', 'SeqMemberPath', N('GraphNodePath') + ' | ' + T("'...'") + ' | ' + N('GAPVAR'), '19.7 [108a]: SeqMemberPath, a gap or a named gap');
    h.ruleReplace('UnaryExpression', T("'!'") + ' ' + N('UnaryExpression') + ' | ' + T("'+'") + ' ' + N('PostfixExpression') + ' | ' + T("'-'") + ' ' + N('PostfixExpression') + ' | ' + N('PostfixExpression'),
      '19.7 [135]: UnaryExpression over PostfixExpression');
    h.ruleRow('UnaryExpression', '135a', 'PostfixExpression', N('PrimaryExpression') + ' | ' + N('PostfixExpression') + ' ' + T("'['") + ' ' + N('Expression') + ' ' + T("']'") + ' | ' +
      N('PostfixExpression') + ' ' + T("'['") + ' ' + N('Expression') + '? ' + T("'...'") + ' ' + N('Expression') + '? ' + T("']'") + '   <i>but not</i> ' + T("'['") + ' ' + T("'...'") + ' ' + T("']'"),
      '19.7 [135a]: PostfixExpression, index and slice');
    h.ruleReplace('RelationalExpression', N('NumericExpression') + ' ( ' + T("'='") + ' ' + N('NumericExpression') + ' | ' + T("'!='") + ' ' + N('NumericExpression') + ' | ' +
      T("'<'") + ' ' + N('NumericExpression') + ' | ' + T("'>'") + ' ' + N('NumericExpression') + ' | ' + T("'<='") + ' ' + N('NumericExpression') + ' | ' + T("'>='") + ' ' + N('NumericExpression') + ' | ' +
      T("'IN'") + ' ( ' + N('ExpressionList') + ' | ' + N('SeqRef') + ' ) | ' + T("'NOT'") + ' ' + T("'IN'") + ' ( ' + N('ExpressionList') + ' | ' + N('SeqRef') + ' ) )?',
      '19.7 [131]: IN over a SeqRef');
    h.ruleRow('RelationalExpression', '131a', 'SeqRef', N('Var') + ' | ' + T("'SEQ'") + ' ' + N('ExpressionList') + ' | ' + N('SeqRef') + ' ' + T("'['") + ' ' + N('Expression') + ' ' + T("']'"),
      '19.7 [131a]: SeqRef');
    h.ruleAppend('BuiltInCall', T("'SEQ'") + ' ' + N('ExpressionList') + ' | ' + T("'SEQLEN'") + ' ' + T("'('") + ' ' + N('Expression') + ' ' + T("')'") + ' | ' + T("'isSEQ'") + ' ' + T("'('") + ' ' + N('Expression') + ' ' + T("')'"),
      '19.7 [141]: SEQ, SEQLEN, isSEQ');
    h.ruleRow('VAR2', '144a', 'GAPVAR', T("'...'") + ' ( ' + N('VAR1') + ' | ' + N('VAR2') + ' )   <i>with no white space between</i>', '19.7 [144a]: GAPVAR');
  }

  function redline(opts) {
    var counter = { n: 0 }, list = document.getElementById('ra-list');
    var status = document.createElement('div'); status.id = 'ra-status'; status.textContent = 'Loading the ' + TITLE + ' from w3.org…';
    var target = document.createElement('div'); target.id = 'ra-doc';
    var nav = document.createElement('div'); nav.id = 'ra-nav'; nav.hidden = true;
    nav.innerHTML = '<button id="ra-prev" type="button" title="Previous change">↑</button><span id="ra-pos">–</span><button id="ra-next" type="button" title="Next change">Next change ↓</button>';
    document.body.appendChild(nav); document.body.appendChild(status); document.body.appendChild(target);
    var show = document.getElementById('ra-show-acc');
    if (show) show.onchange = function () { document.body.classList.toggle('ra-show-acc', show.checked); };

    fetch(SRC).then(function (r) {
      if (!r.ok) throw new Error('w3.org answered ' + r.status);
      var base = r.url;
      return r.text().then(function (text) {
        var src = new DOMParser().parseFromString(text, 'text/html');
        [].forEach.call(src.querySelectorAll('[href], [src]'), function (e) {
          ['href', 'src'].forEach(function (a) {
            var v = e.getAttribute(a);
            if (v && v.charAt(0) !== '#') e.setAttribute(a, new URL(v, base).href);
          });
        });
        var loads = [];   // the imported stylesheets; the layout moves as each arrives
        [].forEach.call(src.head.querySelectorAll('link[rel~="stylesheet"]:not([disabled]), style'), function (e) {
          var n = document.importNode(e, true);
          if (n.tagName === 'LINK') loads.push(new Promise(function (ok) { n.onload = n.onerror = ok; setTimeout(ok, 3000); }));
          document.head.insertBefore(n, document.head.firstChild);
        });
        [].forEach.call(src.body.querySelectorAll('script'), function (s) { s.remove(); });
        while (src.body.firstChild) target.appendChild(document.adoptNode(src.body.firstChild));
        opts.layers.forEach(function (layer) {
          layer.changes(helpers(target, layer.mark ? 'ra' : 'acc', layer.mark, list, counter));
        });
        var count = counter.n;
        document.getElementById('ra-count').textContent = count;
        status.remove();
        var pos = 0, cur = null;
        function go(k) {
          pos = Math.max(1, Math.min(count, k));
          if (cur) cur.classList.remove('ra-current');
          cur = document.getElementById('ra-' + pos); cur.classList.add('ra-current');
          cur.scrollIntoView({ block: 'center' });
          document.getElementById('ra-pos').textContent = pos + ' / ' + count;
        }
        document.getElementById('ra-next').onclick = function () { go(pos + 1); };
        document.getElementById('ra-prev').onclick = function () { go(pos - 1); };
        nav.hidden = false;
        function toHash() { if (location.hash) { var t = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (t) t.scrollIntoView(); } }
        toHash(); Promise.all(loads).then(toHash);
      });
    }).catch(function (e) {
      status.innerHTML = 'Could not build the redline (' + String(e.message || e).replace(/</g, '&lt;') +
        '). The page needs to fetch the ' + TITLE + ' from <a href="' + SRC + '">w3.org</a>; the changes it would mark are listed in its script.';
    });
  }

  window.sparqlRedline = { redline: redline, SPARQL_ARRAY: SPARQL_ARRAY };
})();
