#!/usr/bin/env python3
"""Turn a Markdown document of this repository (a small, regular subset of Markdown) into an HTML
page: a ReSpec specification by default, or a plain page for a demo.

    python3 tools/md-to-respec.py docs/json-ld-array.md docs/json-ld-array.html
    python3 tools/md-to-respec.py --check docs/owl-array.md docs/owl-array.html   # exit 1 when the HTML is out of date

Handles: the leading H1 (becomes the title), paragraphs, bullet lists with continuation lines
(indented two or more spaces) and fenced code blocks inside them, fenced code blocks (```json /
```turtle / ```sparql / ```manchester), pipe tables with a header row, inline code, bold, italics,
links and reference-style link definitions (`[Name]: url` on a line of its own; `[Name]` in the
text becomes the link). HTML passes through: a line that starts a block-level element (`<div`,
`<table`, `<figure`, ...) starts a raw block that runs to the next blank line, `<pre`, `<script`
and `<style` run to their closing tag, and tags and entities inside a paragraph are kept. Sections
come from `##` and `###` headings; a leading "N." / "N.M" is dropped, ReSpec numbers them, and the
text before the first `##` becomes the abstract and an unnumbered introduction, so "§3.4" references
in the prose keep pointing at the right section. JSON is highlighted by ReSpec's highlight.js;
Turtle and SPARQL by a small script of their own.

A bullet list of `- Key: text` items right after the H1 is the document's status, and goes into
ReSpec's header (respecConfig) rather than the introduction: `Revised: YYYY-MM-DD` (or
`Published:`) is publishDate, and with both, Revised is modificationDate, the in-place edit; every
other key is an entry of otherLinks under its label, one header line per item: the key's own text,
or its nested `  - ` items. A line is runs of text and links (a `[text](url)` link, a `[Name]`
reference or a `<https://...>` autolink is a link; the rest is plain text, with code spans and
emphasis flattened; the header holds no nested lists or tables). Without such a list, a leading
italic paragraph is the status note and opens the introduction, as before.

Front matter (`---` lines around `key: value` lines, at the very top; double-quote a value that holds
": ") with `template: page` makes a
plain page instead, styled by page.css beside it: `title` (the <title>), `description` and
`eyebrow` (the line over the H1) come from the front matter; the first paragraph is the lede;
`##` sections are numbered on the page; a paragraph that is only a linked image,
`[![alt](detail.png "caption")](whole.png)`, is a figure with its caption (`\\"` for a quote in it,
and a "Whole window" link when the two images differ); Turtle and Manchester code is highlighted when the page is made;
and what follows a `---` line is the footer.
"""
import html
import json
import os
import re
import struct
import sys

INLINE_CODE = re.compile(r'`([^`]+)`')
BOLD = re.compile(r'\*\*(.+?)\*\*')
ITALIC = re.compile(r'(?<![\w*])\*(?!\*)(.+?)(?<!\*)\*(?![\w*])')
LINK = re.compile(r'\[([^\]]+)\]\(([^)\s]+)\)')
IMAGE = re.compile(r'!\[([^\]]*)\]\(([^)\s]+)\)')
REF = re.compile(r'\[([^\]\[]+)\](?![\(\[\]])')
REF_DEF = re.compile(r'^\[([^\]]+)\]:\s+(\S+)\s*$')
refs = {}   # reference-style link definitions of the document being converted
CITE = re.compile(r'\[(RFC) (\d+)( §[^\]]*)?\]')
HTML_TAG = re.compile(r'</?[A-Za-z][A-Za-z0-9]*(?:\s[^<>]*)?/?>|<!--.*?-->|&(?:[A-Za-z][A-Za-z0-9]*|#[0-9]+|#x[0-9A-Fa-f]+);')
RAW_BLOCK = re.compile(r'^<(address|article|aside|blockquote|details|div|dl|fieldset|figure|footer|form|h[1-6]|header|hr|nav|ol|p|section|table|ul)(\s|/?>|$)', re.I)
RAW_VERBATIM = re.compile(r'^<(pre|script|style|textarea)(\s|>|$)', re.I)
FRONT = re.compile(r'\A---\n(.*?)\n---\n', re.S)
FIGURE = re.compile(r'^\[!\[(?P<alt>.*)\]\((?P<src>[^\s()]+)\s+"(?P<cap>.*)"\)\]\((?P<href>[^\s()]+)\)$')
# Turtle and Manchester tokens for the page template: IRIs, strings, quoted names, comments,
# prefixed names, bare words, list brackets.
HL_TOKEN = re.compile(r'''(<[^>\s]*>)|("(?:[^"\\\n]|\\.)*")|('[^'\n]*')|(#[^\n]*)|([A-Za-z_][\w.-]*:[\w.-]*)|([A-Za-z_][\w-]*)|([()])''')
MANCHESTER_KW = {'SubClassOf', 'EquivalentTo', 'DisjointWith', 'Types', 'Facts', 'some', 'only', 'value',
                 'and', 'or', 'not', 'min', 'max', 'exactly', 'inverse', 'that', 'Self'}


def inline(text):
    """Inline Markdown to HTML; code spans, HTML tags and entities are protected from the other
    substitutions."""
    codes = []

    def stash(fragment):
        codes.append(fragment)
        return '\0%d\0' % (len(codes) - 1)

    # `[[` in a code span is split by an empty element: ReSpec reads `[[x]]` in any text node as a citation.
    text = INLINE_CODE.sub(lambda m: stash('<code>%s</code>' % html.escape(m.group(1), quote=False).replace('[[', '[<span></span>[')), text)
    text = HTML_TAG.sub(lambda m: stash(m.group(0)), text)
    text = html.escape(text, quote=False)
    text = IMAGE.sub(r'<img src="\2" alt="\1" style="max-width: 100%">', text)
    text = LINK.sub(r'<a href="\2">\1</a>', text)
    text = REF.sub(lambda m: '<a href="%s">%s</a>' % (refs[m.group(1)], m.group(1)) if m.group(1) in refs else m.group(0), text)
    text = CITE.sub(lambda m: '[[%s%s]]%s' % (m.group(1), m.group(2), m.group(3) or ''), text)
    text = text.replace('[INFRA]', '[[INFRA]]')
    text = BOLD.sub(r'<strong>\1</strong>', text)
    text = ITALIC.sub(r'<em>\1</em>', text)
    return re.sub('\0(\\d+)\0', lambda m: codes[int(m.group(1))], text)


def slug(text):
    text = re.sub(r'`', '', text)
    text = re.sub(r'[^A-Za-z0-9]+', '-', text).strip('-').lower()
    return text


def split_row(line):
    cells, cur, in_code = [], [], False
    for ch in re.sub(r'\\\|', '\0', line.strip().strip('|')):   # \| is a pipe in a cell, as on GitHub
        if ch == '\0':
            cur.append('|')
            continue
        if ch == '`':
            in_code = not in_code
        if ch == '|' and not in_code:
            cells.append(''.join(cur).strip())
            cur = []
        else:
            cur.append(ch)
    cells.append(''.join(cur).strip())
    return cells


def highlight(lang, code):
    """Turtle or Manchester syntax to HTML spans for page.css: keywords, strings, comments and, in
    Turtle, the brackets of a list."""
    keywords = MANCHESTER_KW | ({'a'} if lang == 'turtle' else set())
    out, last = [], 0
    for m in HL_TOKEN.finditer(code):
        out.append(html.escape(code[last:m.start()], quote=False))
        tok, cls = m.group(0), None
        if m.group(2):
            cls = 's'
        elif m.group(4):
            cls = 'c'
        elif m.group(5) and tok.endswith(':') and tok[:-1] in keywords:
            out.append('<span class="k">%s</span>:' % tok[:-1])
            last = m.end()
            continue
        elif m.group(6) and tok in keywords:
            cls = 'k'
        elif m.group(7) and lang == 'turtle':
            cls = 'l'
        esc = html.escape(tok, quote=False)
        out.append('<span class="%s">%s</span>' % (cls, esc) if cls else esc)
        last = m.end()
    out.append(html.escape(code[last:], quote=False))
    return ''.join(out)


def png_size(path):
    try:
        with open(path, 'rb') as f:
            head = f.read(24)
    except OSError:
        return None
    return struct.unpack('>II', head[16:24]) if head[:8] == b'\x89PNG\r\n\x1a\n' else None


def convert(md, page=False, base='.'):
    """The blocks of a document: (title, blocks before the first ##, sections). With page, code,
    tables and figures are written for the page template; base is the directory of the HTML, for
    the size of an image."""
    lines = []
    for line in md.split('\n'):
        ref = REF_DEF.match(line)
        if ref:
            refs[ref.group(1)] = ref.group(2)
        else:
            lines.append(line)
    title = None
    sections = []       # stack of (level, id, title, blocks)
    sections_top = []
    pre_sections = []   # blocks before the first ## (abstract + introduction)
    i = 0

    def code_block(lang, code):
        if page:
            text = '\n'.join(code)
            body = highlight(lang, text) if lang in ('turtle', 'manchester') else html.escape(text, quote=False)
            return '<pre><code>%s</code></pre>' % body
        cls = {'json': 'json nohighlight', 'turtle': 'turtle nohighlight', 'sparql': 'sparql nohighlight'}.get(lang, 'nohighlight')
        return '<pre class="example %s">%s</pre>' % (cls, html.escape('\n'.join(code), quote=False))

    def figure(text):
        m = FIGURE.match(text) if page else None
        if not m:
            return None
        src, href = m.group('src'), m.group('href')
        size = png_size(os.path.join(base, src))
        dims = ' width="%d" height="%d"' % size if size else ''
        caption = inline(m.group('cap').replace('\\"', '"'))
        if href != src:
            caption += ' <a class="full" href="%s">Whole window</a>' % html.escape(href)
        return '<figure>\n<a href="%s"><img src="%s"%s loading="lazy" alt="%s"></a>\n<figcaption>%s</figcaption>\n</figure>' % (
            html.escape(href), html.escape(src), dims, html.escape(m.group('alt')), caption)

    def flush_para(para):
        if para:
            text = ' '.join(s.strip() for s in para)
            blocks.append(figure(text) or '<p>%s</p>' % inline(text))
            para.clear()

    para = []
    blocks = pre_sections

    while i < len(lines):
        line = lines[i]
        if line.startswith('# ') and title is None:
            title = inline(line[2:].strip())
            i += 1
            continue
        heading = re.match(r'^(##+) (.*)$', line)
        if heading:
            flush_para(para)
            level = len(heading.group(1))
            text = re.sub(r'^\d+(\.\d+)*\.? ', '', heading.group(2)).strip()
            sec_id = slug(text)
            while sections and sections[-1][0] >= level:
                sections.pop()
            parent = sections[-1][3] if sections else None
            new_blocks = []
            entry = (level, sec_id, text, new_blocks)
            if parent is None:
                sections_top.append(entry)
            else:
                parent.append(entry)
            sections.append(entry)
            blocks = new_blocks
            i += 1
            continue
        if RAW_VERBATIM.match(line) or line.startswith('<!--'):
            # Raw HTML to its closing tag: <pre>, <script>, <style>, a comment.
            flush_para(para)
            m = RAW_VERBATIM.match(line)
            close = '</%s>' % m.group(1).lower() if m else '-->'
            raw = []
            while i < len(lines):
                raw.append(lines[i])
                i += 1
                if close in raw[-1].lower():
                    break
            blocks.append('\n'.join(raw))
            continue
        if RAW_BLOCK.match(line):
            # Raw HTML to the next blank line.
            flush_para(para)
            raw = []
            while i < len(lines) and lines[i].strip():
                raw.append(lines[i])
                i += 1
            blocks.append('\n'.join(raw))
            continue
        if line.startswith('```'):
            flush_para(para)
            lang = line[3:].strip() or 'text'
            code = []
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                code.append(lines[i])
                i += 1
            i += 1
            blocks.append(code_block(lang, code))
            continue
        if line.startswith('|'):
            flush_para(para)
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                rows.append(lines[i])
                i += 1
            header = split_row(rows[0])
            body = [split_row(r) for r in rows[2:]] if len(rows) > 1 and re.match(r'^\|[-| ]+\|$', rows[1]) else [split_row(r) for r in rows[1:]]
            t = ['<div class="table-wrap">\n<table>' if page else '<table class="simple">', '<thead><tr>%s</tr></thead>' % ''.join('<th>%s</th>' % inline(c) for c in header), '<tbody>']
            for r in body:
                t.append('<tr>%s</tr>' % ''.join('<td>%s</td>' % inline(c) for c in r))
            t.append('</tbody></table>' + ('\n</div>' if page else ''))
            blocks.append('\n'.join(t))
            continue
        if re.match(r'^(\d+\.|-) ', line):
            flush_para(para)
            ordered = line[0].isdigit()
            items = []      # each item: a list of Markdown text (str) and HTML (a 1-tuple)
            while i < len(lines) and (re.match(r'^(\d+\.|-) ', lines[i]) or (lines[i].startswith('  ') and lines[i].strip())):
                if re.match(r'^(\d+\.|-) ', lines[i]):
                    items.append([re.sub(r'^(\d+\.|-) ', '', lines[i])])
                elif lines[i].lstrip().startswith('```'):
                    # A fenced block inside the item, indented as the item's continuation lines are.
                    indent = len(lines[i]) - len(lines[i].lstrip())
                    lang = lines[i].strip()[3:].strip() or 'text'
                    code = []
                    i += 1
                    while i < len(lines) and not lines[i].lstrip().startswith('```'):
                        code.append(lines[i][indent:] if not lines[i][:indent].strip() else lines[i].lstrip())
                        i += 1
                    items[-1].append((code_block(lang, code),))
                elif isinstance(items[-1][-1], str):
                    items[-1][-1] += ' ' + lines[i].strip()
                else:
                    items[-1].append(lines[i].strip())
                i += 1
            tag = 'ol' if ordered else 'ul'
            blocks.append('<%s>%s</%s>' % (tag, ''.join('<li>%s</li>' % '\n'.join(
                inline(part) if isinstance(part, str) else part[0] for part in it) for it in items), tag))
            continue
        if not line.strip():
            flush_para(para)
            i += 1
            continue
        para.append(line)
        i += 1
    flush_para(para)
    return title, pre_sections, sections_top


def render_sections(entries, indent='  '):
    parts = []
    for level, sec_id, text, blocks in entries:
        parts.append('%s<section id="%s">' % (indent, sec_id))
        parts.append('%s<h%d>%s</h%d>' % (indent, level, inline(text), level))
        for b in blocks:
            if isinstance(b, tuple):
                parts.append(render_sections([b], indent + '  '))
            else:
                parts.append(indent + b.replace('\n', '\n' + indent))
        parts.append('%s</section>' % indent)
    return '\n'.join(parts)


TEMPLATE = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>%(title_text)s</title>
  <script src="https://www.w3.org/Tools/respec/respec-w3c" class="remove" defer></script>
  <script class="remove">
    var respecConfig = {
      specStatus: "unofficial",
      shortName: "%(short_name)s",
      editors: [{ name: "Eric Prud'hommeaux" }],
      edDraftURI: "https://rdf-array.github.io/rdf-array/%(page_path)s",
%(status)s      latestVersion: null,
      postProcess: [function (config, doc) {
        // An otherLinks entry is lines of text and links: ReSpec gives every run its own <dd>, so a
        // run marked `join` is appended to the line before it.
        (config.otherLinks || []).forEach(function (entry) {
          var dt = Array.from(doc.querySelectorAll('.head dt')).find(function (e) { return e.textContent.trim() === entry.key; });
          var dds = [], line = null;
          for (var e = dt && dt.nextElementSibling; e && e.tagName === 'DD'; e = e.nextElementSibling) dds.push(e);
          dds.forEach(function (dd, i) {
            if (line && entry.data[i] && entry.data[i].join) { line.append(' '); while (dd.firstChild) line.append(dd.firstChild); dd.remove(); }
            else line = dd;
          });
          // One space between runs, none before punctuation (the template leaves whitespace and comment nodes around).
          dds.filter(function (dd) { return dd.parentNode; }).forEach(function (dd) {
            var walker = doc.createTreeWalker(dd, NodeFilter.SHOW_TEXT), t, texts = [];
            while ((t = walker.nextNode())) texts.push(t);
            texts.forEach(function (t, i) {
              t.data = t.data.replace(/\\s+/g, ' ');
              if (/^ [,.;:)']/.test(t.data)) t.data = t.data.slice(1);
              if (t.data === ' ') {
                var j = i + 1;
                while (texts[j] && /^\\s*$/.test(texts[j].data)) j++;
                if (texts[j] && /^\\s*[,.;:)']/.test(texts[j].data)) t.data = '';
              }
            });
          });
        });
      }],
      overrideCopyright: "<p class='copyright'>Copyright &copy; 2026 the rdf-array project. This document is licensed under a <a href='https://creativecommons.org/licenses/by/4.0/'>Creative Commons Attribution 4.0 License</a>.</p>",
      lint: { "no-unused-dfns": false },
      localBiblio: {
        "RML-CORE": { title: "RML-Core: Generic Mapping Language for RDF", href: "https://w3id.org/rml/core/spec", publisher: "W3C Knowledge Graph Construction Community Group" },
        "RML-CC": { title: "RML-CC: RML Collections and Containers", href: "https://w3id.org/rml/cc/spec", publisher: "W3C Knowledge Graph Construction Community Group" },
        "RML-LV": { title: "RML-LV: RML Logical Views", href: "https://w3id.org/rml/lv/spec", publisher: "W3C Knowledge Graph Construction Community Group" },
        "RML-FNML": { title: "RML-FNML: RML Functions", href: "https://w3id.org/rml/fnml/spec", publisher: "W3C Knowledge Graph Construction Community Group" },
        "YARRRML": { title: "YARRRML", href: "https://rml.io/yarrrml/spec/", publisher: "IDLab, Ghent University" }
      }
    };
  </script>
  <style>
    table.simple { font-size: 0.9em; }
    table.simple td, table.simple th { vertical-align: top; }
    pre.example { font-size: 0.9em; line-height: 1.35; }
    .hljs-iri { color: #0b5394; }
    .hljs-pname { color: #38761d; }
    .hljs-lit { color: #a61c00; }
    .hljs-kw { color: #741b47; font-weight: bold; }
    .hljs-var { color: #b45f06; }
    .hljs-cmt { color: #777; font-style: italic; }
    .hljs-bnode { color: #666; }
    .hljs-num, .hljs-number { color: #a61c00; }
    .hljs-attr { color: #0b5394; }
    .hljs-string { color: #38761d; }
    .hljs-literal { color: #741b47; }
  </style>
</head>
<body>
  <section id="abstract">
%(abstract)s
  </section>
  <section id="sotd">
    <p>This is a working document of the <a href="https://github.com/rdf-array">rdf-array</a> project, generated from <a href="https://github.com/rdf-array/rdf-array/blob/rdf-sequences/%(source)s">%(source)s</a> by <code>tools/md-to-respec.py</code> in the same repository. It is not a W3C document and has no standing anywhere.</p>
  </section>
  <section class="introductory" id="introduction">
    <h2>Introduction</h2>
%(intro)s
  </section>
%(sections)s
  <script>
  // Turtle-array and SPARQL-array highlighting: a few token classes are enough for these examples.
  (function () {
    var token = /(<[^>\\s]*>)|("""[\\s\\S]*?"""|"(?:[^"\\\\]|\\\\.)*")(@[A-Za-z0-9-]+|\\^\\^[^\\s;,.()\\]]+)?|(#[^\\n]*)|(\\?[A-Za-z_][\\w]*)|(_:[A-Za-z0-9_-]+)|(\\b(?:PREFIX|BASE|SELECT|CONSTRUCT|ASK|DESCRIBE|WHERE|DELETE|INSERT|DATA|FILTER|OPTIONAL|UNION|ORDER|BY|GROUP|LIMIT|OFFSET|BIND|VALUES|GRAPH|a)\\b)|(\\b-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b)|([A-Za-z][\\w-]*:[\\w#./-]*|[A-Za-z][\\w-]*:)/g;
    function paint(pre) {
      var src = pre.textContent, out = '', last = 0, m;
      token.lastIndex = 0;
      while ((m = token.exec(src))) {
        out += esc(src.slice(last, m.index));
        var cls = m[1] ? 'hljs-iri' : m[2] ? 'hljs-lit' : m[4] ? 'hljs-cmt' : m[5] ? 'hljs-var' : m[6] ? 'hljs-bnode' : m[7] ? 'hljs-kw' : m[8] ? 'hljs-num' : 'hljs-pname';
        out += '<span class="' + cls + '">' + esc(m[0]) + '</span>';
        last = token.lastIndex;
      }
      out += esc(src.slice(last));
      pre.innerHTML = out;
    }
    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    var jsonToken = /("(?:[^"\\\\]|\\\\.)*")(\\s*:)?|(-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)|\\b(true|false|null)\\b/g;
    function paintJson(pre) {
      var src = pre.textContent, out = '', last = 0, m;
      jsonToken.lastIndex = 0;
      while ((m = jsonToken.exec(src))) {
        out += esc(src.slice(last, m.index));
        if (m[1]) { out += '<span class="' + (m[2] ? 'hljs-attr' : 'hljs-string') + '">' + esc(m[1]) + '</span>' + esc(m[2] || ''); }
        else if (m[3]) { out += '<span class="hljs-number">' + esc(m[3]) + '</span>'; }
        else { out += '<span class="hljs-literal">' + esc(m[4]) + '</span>'; }
        last = jsonToken.lastIndex;
      }
      out += esc(src.slice(last));
      pre.innerHTML = out;
    }
    function tidyHeader() {
      // An unofficial draft has no published version; ReSpec prints the line anyway.
      document.querySelectorAll('.head dt').forEach(function (dt) {
        if (/^Latest published version/.test(dt.textContent)) { var dd = dt.nextElementSibling; dt.remove(); if (dd && dd.tagName === 'DD') dd.remove(); }
      });
    }
    function run() { tidyHeader(); document.querySelectorAll('pre.turtle, pre.sparql').forEach(paint); document.querySelectorAll('pre.json').forEach(paintJson); }
    if (document.respec && document.respec.ready) { document.respec.ready.then(run); } else { document.addEventListener('DOMContentLoaded', run); }
  })();
  </script>
</body>
</html>
'''


PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(title)s</title>
<meta name="description" content="%(description)s">
<link rel="stylesheet" href="page.css">
</head>
<body>
<!-- Generated from %(source)s by tools/md-to-respec.py; edit that file, not this one. -->
<main>

<header class="top">
<p class="eyebrow">%(eyebrow)s</p>
<h1>%(h1)s</h1>
%(lede)s
</header>

%(intro)s

%(sections)s

<footer>
%(footer)s
</footer>

</main>
</body>
</html>
"""


def render_page_sections(entries):
    parts = []
    for n, (level, sec_id, text, blocks) in enumerate(entries, 1):
        number = '<span class="n">%d</span>' % n if level == 2 else ''
        parts.append('<section id="%s">\n<h%d>%s%s</h%d>' % (sec_id, level, number, inline(text), level))
        for b in blocks:
            parts.append(render_page_sections([b]) if isinstance(b, tuple) else b)
        parts.append('</section>')
    return '\n'.join(parts)


STATUS_ITEM = re.compile(r'^- ([A-Z][\w ]*?):(?: (.*))?$')
AUTOLINK = re.compile(r'<(https?://[^>\s]+)>')
DATE = re.compile(r'^(\d{4}-\d{2}-\d{2})(?:[,;:]?\s+(.*))?$', re.S)


def status_list(md):
    """The `- Key: text` list right after the H1, if the document has one, as [(key, lines)], each
    item's text or its nested `  - ` items as lines with continuation lines joined, and the
    document without it."""
    m = re.match(r'(# [^\n]*\n\n+)((?:- [^\n]*\n(?:[ ]{2,}[^\n]*\n)*)+)\n', md)
    if not m:
        return [], md
    items = []
    for item in re.split(r'\n(?=- )', m.group(2).rstrip('\n')):
        lines = []
        for l in item.split('\n'):
            if lines and not re.match(r'^[ ]{2,}- ', l):
                lines[-1] += ' ' + l.strip()    # a continuation line
            else:
                lines.append(l.strip())
        k = STATUS_ITEM.match(lines[0])
        if not k:
            return [], md    # a list that is not all `Key: text` is content, not status
        nested = [l[2:].strip() for l in lines[1:]]
        items.append((k.group(1), ([k.group(2).strip()] if k.group(2) else []) + nested))
    for line in md.split('\n'):    # reference-style definitions, for `[Name]` links in the values
        ref = REF_DEF.match(line)
        if ref:
            refs[ref.group(1)] = ref.group(2)
    return items, md[:m.start(2)] + md[m.end(2):]


def header_runs(text):
    """A status value as ReSpec otherLinks data: its links, and the plain text between them."""
    runs = []

    def plain(s):
        s = INLINE_CODE.sub(r'\1', s)
        s = BOLD.sub(r'\1', s)
        s = ITALIC.sub(r'\1', s)
        s = re.sub(r'\s+', ' ', s).strip()
        if s:
            runs.append({'value': s})

    pos = 0
    pattern = re.compile('|'.join('(?:%s)' % p for p in (LINK.pattern, AUTOLINK.pattern, REF.pattern)))
    for m in pattern.finditer(text):
        link = LINK.match(m.group(0)) or None
        auto = AUTOLINK.match(m.group(0)) if not link else None
        ref = REF.match(m.group(0)) if not link and not auto else None
        if ref and ref.group(1) not in refs:
            continue
        plain(text[pos:m.start()])
        if link:
            runs.append({'value': link.group(1), 'href': link.group(2)})
        elif auto:
            runs.append({'value': auto.group(1), 'href': auto.group(1)})
        else:
            runs.append({'value': ref.group(1), 'href': refs[ref.group(1)]})
        pos = m.end()
    plain(text[pos:])
    return runs


def status_config(items):
    """The respecConfig lines for a status list: publishDate, modificationDate and otherLinks.
    An entry's data is one item per header line; a run that continues a line is marked `join`,
    for the template's postProcess (ReSpec itself gives every run a line)."""
    config = []
    other = []
    keys = [k for k, _ in items]
    for key, lines in items:
        date = DATE.match(lines[0]) if key in ('Published', 'Revised') and len(lines) == 1 else None
        if date:
            # Revised alone dates the draft; with Published, it is the in-place edit of that draft.
            field = 'publishDate' if key == 'Published' or 'Published' not in keys else 'modificationDate'
            config.append('%s: %s,' % (field, json.dumps(date.group(1))))
            lines = [date.group(2)] if date.group(2) else []
            if not lines:
                continue
        data = []
        for line in lines:
            runs = header_runs(line)
            for run in runs[1:]:
                run['join'] = True
            data += runs
        other.append({'key': key + ':', 'data': data})   # the colon, as ReSpec's own labels have
    if other:
        config.append('otherLinks: ' + json.dumps(other, ensure_ascii=False, indent=2).replace('\n', '\n      ') + ',')
    return ''.join('      %s\n' % line for line in config)


def render_page(md, meta, src, dst):
    body, _, footer = md.rpartition('\n---\n') if '\n---\n' in md else (md, '', '')
    base = os.path.dirname(dst)
    title, pre, tops = convert(body, page=True, base=base)
    lede = pre[0].replace('<p>', '<p class="lede">', 1) if pre else ''
    return PAGE_TEMPLATE % {
        'title': html.escape(meta.get('title') or re.sub(r'<[^>]+>', '', title or '')),
        'description': html.escape(meta.get('description', '')),
        'eyebrow': inline(meta.get('eyebrow', '')),
        'h1': title or '',
        'lede': lede,
        'intro': '\n\n'.join(pre[1:]),
        'sections': render_page_sections(tops),
        'footer': '\n'.join(convert(footer, page=True, base=base)[1]),
        'source': os.path.relpath(src).replace(os.sep, '/'),
    }


def render(src, dst):
    md = open(src, encoding='utf-8').read()
    meta = {}
    front = FRONT.match(md)
    if front:
        # One `key: value` a line; a value holding ": " is double-quoted, as YAML (and GitHub's view) needs.
        meta = dict(re.match(r'^(\w+):\s*(.*)$', l).groups() for l in front.group(1).split('\n') if l.strip())
        meta = {k: v[1:-1].replace('\\"', '"') if len(v) > 1 and v[0] == v[-1] == '"' else v for k, v in meta.items()}
        md = md[front.end():]
    if meta.get('template') == 'page':
        return render_page(md, meta, src, dst)
    items, md = status_list(md)
    title, pre, tops = convert(md)
    # The abstract is the first real paragraph after the italic status note (when the status is not
    # the bullet list, which went to the header); the rest is the introduction.
    status = pre[0] if pre and pre[0].startswith('<p><em>') else ''
    rest = pre[1:] if status else pre
    abstract = rest[0] if rest else ''
    intro = ([status] if status else []) + rest[1:]
    title_text = re.sub(r'<[^>]+>', '', title or 'JSON-LD-array')
    short_name = os.path.splitext(os.path.basename(dst))[0]
    # Paths are relative to the repository root, where the Pages check runs: examples/fhir/index.html
    page_path = os.path.relpath(dst).replace(os.sep, '/')
    source_path = os.path.relpath(src).replace(os.sep, '/')
    page = TEMPLATE % {
        'title_text': html.escape(title_text, quote=False),
        'short_name': short_name,
        'page_path': html.escape(page_path, quote=False),
        'source': html.escape(source_path, quote=False),
        'status': status_config(items),
        'abstract': '    ' + abstract,
        'intro': '\n'.join('    ' + b for b in intro),
        'sections': render_sections(tops),
    }
    return page


def main(src, dst, check=False):
    page = render(src, dst)
    if check:
        # The Pages workflow: is the committed rendering what this source gives?
        current = os.path.exists(dst) and open(dst, encoding='utf-8').read() == page
        print(('current:' if current else 'out of date:'), dst)
        return 0 if current else 1
    open(dst, 'w', encoding='utf-8').write(page)
    print('wrote', dst, 'with', sum(1 for _ in re.finditer('<section ', page)), 'sections')
    return 0


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a != '--check']
    sys.exit(main(args[0], args[1], check='--check' in sys.argv[1:]))
