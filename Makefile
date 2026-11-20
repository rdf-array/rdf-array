# The generated files of this repository, which are tracked: `make` after editing a source,
# then commit the rendering with it.
#
#   make             render every document whose HTML is not what its source gives:
#                    docs/<doc>.html from docs/<doc>.md, examples/<x>/index.html from its README.md
#                    (an example is published once it has an index.html), both by tools/md-to-respec.py.
#                    The renderer's --check decides, not timestamps: a branch switch gives every file
#                    it rewrites one timestamp, and a page's figures feed the rendering too
#   make check       what the Pages workflow asks of a push: every rendering current, repos.json
#                    in step with repos.html's links (exit 1 otherwise, nothing written)
#   make lists       regenerate management/contrib-duplicates.md and management/array-syntax-uses.md
#   make check-lists exit 1 if either list differs from what the checkouts beside this one give
#   make jena-tool   compile tools/JenaArray.java into .tools/ for tools/rewrite-rdf-syntax.py
#
# Not built here: docs/html-index.html, the redlines docs/owl-direct-semantics-*.html and
# docs/sparql-query-*.html (a banner; the page fetches the W3C text and redlines it in the
# browser), management/repos.html (renders
# repos.json in the browser) and vocab/index.html are written by hand.
#
# The lists are not part of `make`: they read the test-suite checkouts beside this repository,
# so they say what those checkouts' branches hold. Regenerate and commit them on rdf-sequences
# with the siblings on rdf-sequences; management/ changes only there and merges into rdf-undef.
#
# Run from this directory: a rendering records its source's path relative to the current
# directory, and the Pages check compares from the repository root.

PYTHON ?= python3
RESPEC = $(PYTHON) tools/md-to-respec.py
JAVA ?= /opt/homebrew/opt/openjdk@21/bin/java
JAVAC ?= $(dir $(JAVA))javac

DOC_HTML = $(patsubst %.md,%.html,$(wildcard docs/*.md))
EXAMPLE_HTML = $(wildcard examples/*/index.html)
LISTS = management/contrib-duplicates.md management/array-syntax-uses.md

.PHONY: all docs lists check check-docs check-repos check-lists jena-tool

all: docs

docs: $(DOC_HTML) $(EXAMPLE_HTML)

# Always run; render only when the committed HTML is not what the source gives now.
docs/%.html: docs/%.md FORCE
	@$(RESPEC) --check $< $@ >/dev/null || $(RESPEC) $< $@

examples/%/index.html: examples/%/README.md FORCE
	@$(RESPEC) --check $< $@ >/dev/null || $(RESPEC) $< $@

FORCE:

lists:
	$(PYTHON) tools/contrib-duplicates.py
	$(PYTHON) tools/array-syntax-uses.py

check: check-docs check-repos

check-docs:
	@status=0; for html in $(DOC_HTML) $(EXAMPLE_HTML); do \
	  case $$html in docs/*) md=$${html%.html}.md;; *) md=$$(dirname $$html)/README.md;; esac; \
	  $(RESPEC) --check $$md $$html || status=1; \
	done; \
	[ $$status = 0 ] || echo "a rendering is out of date: run make on that branch and commit the HTML" >&2; \
	exit $$status

check-repos:
	$(PYTHON) tools/manifest-check.py --offline

check-lists:
	@$(PYTHON) tools/contrib-duplicates.py --check && $(PYTHON) tools/array-syntax-uses.py --check \
	  || { echo "a management list is out of date: run make lists on rdf-sequences, with the suites beside this repository on rdf-sequences, and commit it" >&2; exit 1; }

# .tools/ is ignored by git. cp.txt is jena-array's classpath, the modules' target/classes and their
# jars, colon-separated, written once by hand (Maven is not always available to print it).
jena-tool: .tools/JenaArray.class

.tools/JenaArray.class: tools/JenaArray.java .tools/cp.txt
	$(JAVAC) -d .tools -cp "$$(cat .tools/cp.txt)" $<

.tools/cp.txt:
	@echo "$@ is missing: write jena-array's classpath there (see tools/rewrite-rdf-syntax.py)" >&2; exit 1
