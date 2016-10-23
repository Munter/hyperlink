var relationDebugDescription = require('../relationDebugDescription');

module.exports = function (tapReporter, options) {
    options = options || {};

    return function (assetGraph) {
        tapReporter.push({
            name: 'Checking fragment identifier references'
        });

        assetGraph.findRelations({
            type: 'HtmlAnchor',
            href: /#.*/,
            to: {
                type: 'Html',
                isLoaded: true
            }
        }).forEach(function (relation) {
            var document = relation.to.parseTree;
            var selector = relation.href.replace(/^[^#]*#/, '');

            // Linking to the empty fragment in a different document makes no sense
            if (selector === '' && relation.href !== '#') {
                tapReporter.push(null, {
                    ok: false,
                    name: 'Fragment check: ' + relation.from.urlOrDescription + ' --> ' + relation.href,
                    operator: 'empty-fragment',
                    expected: 'Fragment identifiers in links to different documents should not be empty',
                    at: relationDebugDescription(relation)
                });

                return;
            }

            // Empty fragments inside the same document are allowed
            // Only run fragment detection test if it exists
            if (selector) {
                tapReporter.push(null, {
                    ok: !!document.getElementById(selector),
                    name: 'Fragment check: ' + relation.from.urlOrDescription + ' --> ' + relation.href,
                    operator: 'missing-fragment',
                    actual: null,
                    expected: 'id="' + selector + '"',
                    at: relationDebugDescription(relation)
                });
            }

        });
    };
};
