/* Redlines of the OWL 2 Direct Semantics (Second Edition) for the rdf-array project.
 *
 * A redline page holds only its changes. When it is opened, redline() fetches the Recommendation
 * from w3.org (w3.org allows the request), moves its body into the page and applies the changes to
 * it in the reader's browser, so the W3C text shown is the published one. Each change is one call
 * of the helpers below; a change of the layer under review is marked, new text as <ins class="ra">
 * and removed text as <del class="ra">, and listed in the banner. A layer accepted earlier (the
 * OWL-array changes under the rdf-undef redline) is applied first with the class "acc", unmarked
 * unless body.ra-show-acc is set.
 *
 *   redline({ layers: [ { changes: OWL_ARRAY, mark: false }, { changes: myChanges, mark: true } ] })
 *
 * A changes function receives the helpers bound to its layer:
 *   section(id)                      the elements of the section whose anchor is <a id="id">
 *   find(id, selector, text)         the innermost element of the section matching both
 *   lastOf(id, selector)             the last top-level element of the section that matches
 *   edit(el, text, html, label, delPart, before)
 *                                    after the first occurrence of `text` in el (before it, with
 *                                    `before`), insert `html`; `delPart`, a suffix of `text`, is marked removed
 *   block(ref, 'before'|'after', html, label, example)   a new <div>, an example when `example`
 *   li(ref, html, label)             a new list item after `ref`
 *   row(ref, cells, label)           a new table row after `ref`, cells an array of HTML strings
 *   insAfter(node, html, label)      a new <ins> right after a node
 *   splice(textNode, start, length, html, label)   mark `length` characters of a text node removed and insert `html` after them
 *   INS(html)                        '<ins class="…">html</ins>', for HTML strings
 *   I(s), SEQ, LEN, EL               italics and the names of the interpretation's new parts
 */
(function () {
  var SRC = 'https://www.w3.org/TR/owl2-direct-semantics/';

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
    h.SEQ = h.I('SEQ'); h.LEN = h.I('len'); h.EL = h.I('el');
    // The elements of a section: the siblings after its anchor, up to the next section anchor.
    h.section = function (id) {
      var a = doc.querySelector('a[id="' + id + '"]'), out = [];
      for (var el = a.nextElementSibling.nextElementSibling; el; el = el.nextElementSibling) {
        if (el.tagName === 'A' && el.id && el.nextElementSibling && /^H[2-4]$/.test(el.nextElementSibling.tagName)) break;
        out.push(el);
      }
      return out;
    };
    h.find = function (id, selector, text) {
      var els = h.section(id);
      for (var i = 0; i < els.length; i++) {
        // The innermost match: a nested list item rather than the item that holds its list.
        var cands = [els[i]].concat([].slice.call(els[i].querySelectorAll(selector))), hit = null;
        for (var j = 0; j < cands.length; j++)
          if (cands[j].matches(selector) && (!text || norm(cands[j].textContent).indexOf(text) >= 0)) hit = cands[j];
        if (hit) return hit;
      }
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
        var k = node.data.replace(/ /g, ' ').indexOf(text);
        if (k < 0) continue;
        if (before) return h.splice(node, k, 0, insHtml, label);
        var n = delPart ? delPart.length : 0;
        return h.splice(node, k + text.length - n, n, insHtml, label);
      }
      throw new Error('text not found: ' + text);
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
      tr.innerHTML = cells.map(function (c, i) { return '<td' + (i === 0 ? ' class="name"' : '') + '>' + h.INS(c) + '</td>'; }).join('');
      ref.parentNode.insertBefore(tr, ref.nextSibling);
      return mark(tr, label);
    };
    return h;
  }

  // OWL-array: sequence terms in the data, each occurrence an anonymous individual of its own,
  // the ra: built-ins and ObjectTupleOf. The design is owl-array.md §3 and §10.
  function OWL_ARRAY(h) {
    var I = h.I, SEQ = h.SEQ, LEN = h.LEN, EL = h.EL, find = h.find, edit = h.edit, block = h.block, li = h.li, lastOf = h.lastOf;

    // 1 Introduction: the running example.
    block(lastOf('Introduction', 'p'), 'after',
      '<p>OWL-array changes the semantics in one place: an ontology may hold <i>sequence terms</i> ( t<sub>1</sub> … t<sub>n</sub> ), each ' +
      'element an individual (named, anonymous or another sequence term) or a literal, and a class expression ' +
      '<span class="name">ObjectTupleOf( u<sub>1</sub> … u<sub>n</sub> )</span> describes the sequences with given elements. ' +
      'The examples in this document use the ontology <i>O<sub>G</sub></i>: three axioms from the examples of the OWL 2 Specification and two new ones.</p>' +
      '<pre>SameIndividual( a:Meg a:Megan )                                   <i>(OWL 2 Specification, §9.6.1)</i>\n' +
      'DifferentIndividuals( a:Peter a:Meg a:Chris a:Stewie )            <i>(§9.6.2)</i>\n' +
      'ClassAssertion( a:Boy a:Stewie )                                  <i>(§9.1.3)</i>\n' +
      'ObjectPropertyAssertion( a:children a:Peter ( a:Meg a:Chris a:Stewie ) )        <i>Peter\'s children, eldest first</i>\n' +
      'SubObjectPropertyOf( ObjectPropertyChain( a:children ra:member ) a:fatherOf )</pre>' +
      '<p>In Turtle-array the fourth axiom is <span class="name">a:Peter a:children ( a:Meg a:Chris a:Stewie ) .</span>; read as RDF 1.1, its list is ' +
      'an rdf:first/rdf:rest structure that OWL 2 DL does not admit in data.</p>', 'Introduction: sequence terms and the running example', true);

    // 2.1 Vocabulary.
    edit(find('Vocabulary', 'li', 'is a set of individuals'), '(named and anonymous)',
      ' and sequence terms; <b>each occurrence of a sequence term is an anonymous individual of its own</b>', '2.1 V<sub>I</sub>: sequence terms, one individual per occurrence');
    edit(find('Vocabulary', 'li', 'is a set of classes'), 'owl:Nothing', ', and the class <i>ra:Sequence</i>', '2.1 V<sub>C</sub>: ra:Sequence');
    edit(find('Vocabulary', 'li', 'is a set of object properties'), 'owl:bottomObjectProperty', ', and <i>ra:member</i>, <i>ra:first</i> and <i>ra:last</i>', '2.1 V<sub>OP</sub>: ra:member, ra:first, ra:last');
    edit(find('Vocabulary', 'li', 'is a set of data properties'), 'owl:bottomDataProperty', ', and <i>ra:memberValue</i>, <i>ra:length</i>, <i>ra:firstValue</i> and <i>ra:lastValue</i>', '2.1 V<sub>DP</sub>: ra:memberValue, ra:length, …');
    li(find('Vocabulary', 'li', 'denotes an individual (named or anonymous)'),
      '<span class="name">s</span> denotes a sequence term ( t<sub>1</sub> … t<sub>n</sub> ), n ≥ 0, where each t<sub>i</sub> is an individual or a literal;',
      '2.1 convention s');
    li(find('Vocabulary', 'li', 'denotes a literal'),
      '<span class="name">u</span> denotes a tuple item: a class expression, a data range, a named individual or a literal;', '2.1 convention u');
    block(find('Vocabulary', 'p', 'is not required to contain all datatypes'), 'after',
      '<p>The datatype map contains <i>xsd:nonNegativeInteger</i>, the range of <i>ra:length</i>.</p>', '2.1 datatype map: xsd:nonNegativeInteger');

    // 2.2 Interpretations.
    var p22 = find('Interpretations', 'p', 'is a 10-tuple');
    var named = [].slice.call(p22.querySelectorAll('i')).filter(function (i) { return i.textContent === 'NAMED'; })[0];
    h.insAfter(named, ' , ' + SEQ + ' , ' + LEN + ' , ' + EL, '2.2 interpretation: SEQ, len, el');
    edit(p22, '10-tuple', '13-tuple', '2.2 a 13-tuple', '10-tuple');
    var cl = find('Interpretations', 'li', '(owl:Nothing)');
    edit(cl, '∅.', ' and', '2.2 ⋅C: one more condition', '.');
    li(cl, I('(ra:Sequence)<sup>C</sup>') + ' = ' + SEQ + '.', '2.2 (ra:Sequence)C = SEQ');
    var op = find('Interpretations', 'li', '(owl:bottomObjectProperty)');
    edit(op, '∅.', ' and', '2.2 ⋅OP: more conditions', '.');
    li(op, I('(ra:member)<sup>OP</sup>') + ' = { ( <i>x</i> , ' + EL + '(<i>x</i>, <i>i</i>) ) | <i>x</i> ∈ ' + SEQ + ' , 1 ≤ <i>i</i> ≤ ' + LEN + '(<i>x</i>) , ' + EL + '(<i>x</i>, <i>i</i>) ∈ <i>Δ<sub>I</sub></i> }, and ' +
      I('(ra:first)<sup>OP</sup>') + ' and ' + I('(ra:last)<sup>OP</sup>') + ' are the same with <i>i</i> = 1 and <i>i</i> = ' + LEN + '(<i>x</i>).', '2.2 ra:member, ra:first, ra:last');
    var dp = find('Interpretations', 'li', '(owl:bottomDataProperty)');
    edit(dp, '∅.', ' and', '2.2 ⋅DP: more conditions', '.');
    li(dp, I('(ra:memberValue)<sup>DP</sup>') + ', ' + I('(ra:firstValue)<sup>DP</sup>') + ' and ' + I('(ra:lastValue)<sup>DP</sup>') +
      ' are as for <i>ra:member</i>, <i>ra:first</i> and <i>ra:last</i> with <i>Δ<sub>D</sub></i> in place of <i>Δ<sub>I</sub></i>, and ' +
      I('(ra:length)<sup>DP</sup>') + ' = { ( <i>x</i> , ' + LEN + '(<i>x</i>) ) | <i>x</i> ∈ ' + SEQ + ' }.', '2.2 ra:memberValue, ra:length, …');
    var ind = find('Interpretations', 'li', 'individual interpretation function');
    var indHtml = ' such that, for each sequence term <i>s</i> = ( t<sub>1</sub> … t<sub>n</sub> ) ∈ <i>V<sub>I</sub></i>, <i>(s)<sup>I</sup></i> ∈ ' + SEQ +
      ', ' + LEN + '(<i>(s)<sup>I</sup></i>) = n, and ' + EL + '(<i>(s)<sup>I</sup></i>, i) is <i>(t<sub>i</sub>)<sup>I</sup></i> when t<sub>i</sub> is an individual and <i>(t<sub>i</sub>)<sup>LT</sup></i> when it is a literal; ' +
      'and <i>(a)<sup>I</sup></i> ∉ ' + SEQ + ' for each individual <i>a</i>, named or anonymous, that is not a sequence term.';
    // The item ends "… ∈ ΔI." : strike that last period and put the new conditions in its place.
    var walker = document.createTreeWalker(ind, NodeFilter.SHOW_TEXT), tn, dot = null;
    while ((tn = walker.nextNode())) if (/^\s*\./.test(tn.data)) dot = tn;
    if (dot) h.splice(dot, dot.data.indexOf('.'), 1, indHtml, '2.2 ⋅I: what a sequence term denotes');
    else h.insAfter(ind.lastChild, indHtml, '2.2 ⋅I: what a sequence term denotes');
    li(find('Interpretations', 'li', 'NAMED is a subset of'),
      SEQ + ' is a subset of <i>Δ<sub>I</sub></i> called the set of <i>sequences</i>; ' + LEN + ' is a function from ' + SEQ +
      ' to the non-negative integers; and ' + EL + ' assigns to each <i>x</i> ∈ ' + SEQ + ' and 1 ≤ <i>i</i> ≤ ' + LEN + '(<i>x</i>) an element ' +
      EL + '(<i>x</i>, <i>i</i>) ∈ <i>Δ<sub>I</sub></i> ∪ <i>Δ<sub>D</sub></i>. Two sequences with the same ' + LEN + ' and ' + EL +
      ' need not be equal; two that differ in length or at some position are different.', '2.2 SEQ, len, el');
    block(find('Interpretations', 'p', 'The following sections define the extensions'), 'before',
      '<p>In every model of <i>O<sub>G</sub></i>, Peter\'s <i>a:children</i> value is a sequence <i>x</i> with ' + LEN + '(<i>x</i>) = 3 and ' + EL +
      '(<i>x</i>, 1) = <i>(a:Meg)<sup>I</sup></i> = <i>(a:Megan)<sup>I</sup></i>. The built-ins give these:</p><table>' +
      '<tr><td><i>O<sub>G</sub></i> ⊨</td><td class="ra-ent">ObjectPropertyAssertion( a:fatherOf a:Peter a:Megan )</td><td>the chain through <i>ra:member</i>: the three <i>a:fatherOf</i> assertions of §9.6.2\'s example follow from one list</td></tr>' +
      '<tr><td><i>O<sub>G</sub></i> ⊨</td><td class="ra-ent">ClassAssertion( ObjectSomeValuesFrom( a:children ObjectSomeValuesFrom( ra:last a:Boy ) ) a:Peter )</td><td>the youngest child is a boy</td></tr>' +
      '<tr><td><i>O<sub>G</sub></i> ⊨</td><td class="ra-ent">ClassAssertion( ObjectSomeValuesFrom( a:children DataHasValue( ra:length "3"^^xsd:integer ) ) a:Peter )</td><td></td></tr>' +
      '<tr><td><i>O<sub>G</sub></i> ⊭</td><td class="ra-ent">ClassAssertion( ObjectMinCardinality( 2 a:children ) a:Peter )</td><td>the list is one value</td></tr></table>' +
      '<p>§9.6.2\'s conclusion <span class="name">ObjectMinCardinality( 3 a:fatherOf )</span> holds in every model of <i>O<sub>G</sub></i>, but the chain makes <i>a:fatherOf</i> non-simple, so §2.5\'s restriction excludes the question.</p>',
      '2.2 example: the built-ins', true);

    // 2.2.3 Class Expressions: Table 4.
    h.row(find('Class_Expressions', 'tr', 'DataExactCardinality( n DPE DR )'),
      ['ObjectTupleOf( u<sub>1</sub> ... u<sub>n</sub> )',
       '{ <i>x</i> ∈ ' + SEQ + ' | ' + LEN + '(<i>x</i>) = n and, for each 1 ≤ i ≤ n, ' + EL +
       '(<i>x</i>, i) ∈ <i>(u<sub>i</sub>)<sup>C</sup></i> if u<sub>i</sub> is a class expression, ∈ <i>(u<sub>i</sub>)<sup>DT</sup></i> if a data range, = <i>(u<sub>i</sub>)<sup>I</sup></i> if a named individual, = <i>(u<sub>i</sub>)<sup>LT</sup></i> if a literal }'],
      '2.2.3 Table 4: ObjectTupleOf');
    var rule = block(lastOf('Class_Expressions', 'div'), 'after',
      '<p>An individual in <span class="name">ObjectTupleOf</span> must be named, as one in <span class="name">ObjectHasValue</span> must; a sequence term never appears in a class expression.</p>',
      '2.2.3 ObjectTupleOf takes named individuals');
    block(rule, 'after',
      '<table>' +
      '<tr><td><i>O<sub>G</sub></i> ⊨</td><td class="ra-ent">ClassAssertion( ObjectSomeValuesFrom( a:children ObjectTupleOf( a:Megan a:Chris a:Stewie ) ) a:Peter )</td><td>one list entails another, through §9.6.1\'s SameIndividual</td></tr>' +
      '<tr><td><i>O<sub>G</sub></i> ⊨</td><td class="ra-ent">ClassAssertion( ObjectSomeValuesFrom( a:children ObjectTupleOf( owl:Thing owl:Thing a:Boy ) ) a:Peter )</td><td>a class at a position</td></tr>' +
      '<tr><td><i>O<sub>G</sub></i> ⊭</td><td class="ra-ent">ClassAssertion( ObjectSomeValuesFrom( a:children ObjectTupleOf( a:Chris a:Megan a:Stewie ) ) a:Peter )</td><td>order matters</td></tr>' +
      '<tr><td><i>O<sub>G</sub></i> ⊭</td><td class="ra-ent">ClassAssertion( ObjectComplementOf( ObjectSomeValuesFrom( a:children ObjectTupleOf( a:Chris a:Megan a:Stewie ) ) ) a:Peter )</td><td>Peter may have another list</td></tr>' +
      '<tr><td><i>O<sub>G</sub></i> ∪ { FunctionalObjectProperty( a:children ) } ⊨</td><td class="ra-ent">the same</td><td>the one list has Meg first, and Meg ≠ Chris</td></tr></table>' +
      '<p>At the end of §9.6.2, a functional <i>a:fatherOf</i> makes that example inconsistent; a functional <i>a:children</i> is consistent, because one sequence holds all three children.</p>',
      '2.2.3 example: ObjectTupleOf', true);

    // 2.3.5 Keys.
    block(lastOf('Keys', 'div'), 'after',
      '<p>A sequence is never the interpretation of a named individual, so in some model no sequence is in <i>NAMED</i>: a key never entails that two sequences are equal, ' +
      'and never identifies two individuals through a sequence-valued key property. Identity by elements, if an ontology wants it, needs a construct of its own.</p>',
      '2.3.5 keys do not reach sequences');

    // 2.3.6 Assertions.
    block(lastOf('Assertions', 'div'), 'after',
      '<p>A sequence term is an anonymous individual, so the restrictions of Section 11.2 of the OWL 2 Specification keep it out of SameIndividual, DifferentIndividuals, ' +
      'the negative property assertions, ObjectOneOf and ObjectHasValue. The link between a sequence and its elements is not an ObjectPropertyAssertion and adds no edge to that section\'s forest condition.</p>',
      '2.3.6 where a sequence term may stand');

    // 2.3.7 Ontologies.
    var p237 = find('Ontologies', 'p', 'standardized apart');
    edit(p237, 'with anonymous individuals', ' and sequence terms', '2.3.7 sequence terms standardized apart');
    var occ = block(p237, 'after',
      '<p>Every occurrence of a sequence term in the axiom closure is a distinct anonymous individual, including two occurrences in one axiom and occurrences in different imported ontologies; ' +
      'a structurally equal axiom stated twice is still one axiom.</p>', '2.3.7 occurrences');
    block(occ, 'after',
      '<p>Add Lois with the same children, and compare a data value from §9.5 (Keys):</p><table>' +
      '<tr><td><i>O<sub>G</sub></i> ∪ { ObjectPropertyAssertion( a:children a:Lois ( a:Meg a:Chris a:Stewie ) ) } ⊨</td><td class="ra-ent">ClassAssertion( ObjectSomeValuesFrom( a:children ObjectTupleOf( a:Megan a:Chris a:Stewie ) ) a:Lois )</td></tr>' +
      '<tr><td>the same ⊭</td><td class="ra-ent">∃ x : a:children(a:Peter, x) ∧ a:children(a:Lois, x)</td></tr>' +
      '<tr><td>{ DataPropertyAssertion( a:hasSSN a:Peter "123-45-6789" ), DataPropertyAssertion( a:hasSSN a:Peter_Griffin "123-45-6789" ) } ⊨</td><td class="ra-ent">∃ y : a:hasSSN(a:Peter, y) ∧ a:hasSSN(a:Peter_Griffin, y)</td></tr></table>' +
      '<p>A literal denotes one value in every interpretation; a sequence is like a blank node with a fixed description, neither entailed to be the same as another with the same elements nor entailed to be different. ' +
      'This agrees with RDF simple entailment over the same data.</p>', '2.3.7 example: no identity by elements', true);

    // 2.4 Models.
    var p24 = find('Models', 'p', 'by modifying the interpretation of anonymous individuals');
    edit(p24, 'interpretation of anonymous individuals', ' and sequence terms', '2.4 models reinterpret sequence terms');
    block(p24, 'after',
      '<p>So a sequence term in an entailed ontology <i>O<sub>1</sub></i> is read existentially, and one list entails another directly:</p><table>' +
      '<tr><td><i>O<sub>G</sub></i> ⊨</td><td class="ra-ent">ObjectPropertyAssertion( a:children a:Peter ( a:Megan a:Chris a:Stewie ) )</td><td>Peter\'s list witnesses the new term</td></tr>' +
      '<tr><td><i>O<sub>G</sub></i> ⊨</td><td class="ra-ent">ObjectPropertyAssertion( a:children a:Peter ( a:Meg a:Chris a:Stewie ) ), ObjectPropertyAssertion( a:children a:Peter ( a:Megan a:Chris a:Stewie ) )</td><td>two occurrences, one witness: occurrences are not counted</td></tr>' +
      '<tr><td><i>O<sub>G</sub></i> ⊭</td><td class="ra-ent">ObjectPropertyAssertion( a:children a:Peter ( a:Chris a:Meg a:Stewie ) )</td><td>no witness in some model</td></tr></table>',
      '2.4 example: list entails list', true);
  }

  // Fetch the Recommendation, apply the layers, and wire the banner's list and the navigation.
  function redline(opts) {
    var counter = { n: 0 }, list = document.getElementById('ra-list');
    var status = document.createElement('div'); status.id = 'ra-status'; status.textContent = 'Loading the OWL 2 Direct Semantics from w3.org…';
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
        [].forEach.call(src.head.querySelectorAll('link[rel~="stylesheet"], style'), function (e) {
          document.head.insertBefore(document.importNode(e, true), document.head.firstChild);
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
        if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
      });
    }).catch(function (e) {
      status.innerHTML = 'Could not build the redline (' + String(e.message || e).replace(/</g, '&lt;') +
        '). The page needs to fetch the OWL 2 Direct Semantics from <a href="' + SRC + '">w3.org</a>; the changes it would mark are listed in its script.';
    });
  }

  window.owlRedline = { redline: redline, OWL_ARRAY: OWL_ARRAY };
})();
