module.exports = function relationDebugDescription(relation) {
    if (!relation || !relation.isRelation) {
        throw new Error('relationDebugDescription: relation argument must be an AssetGraph.Relation instance');
    }

    var asset = relation.from.nonInlineAncestor;

    if (asset.isText) {
        var text = asset.rawSrc.toString();
        var linesBefore = text.split(relation.href)[0].split('\n');
        var charsBefore = linesBefore[linesBefore.length - 1];

        var offsets = [linesBefore.length, charsBefore.length + 1].join(':');

        var details;

        if (asset.type === 'Html') {
            details = relation.node.outerHTML.split('>' + relation.node.innerHTML + '<').join('>...<');
        }

        if (asset.url.indexOf('file:') === 0) {
            return [asset.urlOrDescription, offsets].join(':') + ' ' + details;
        } else {
            return asset.urlOrDescription + ' (' + offsets + ') ' + details;
        }
    }

    return asset.urlOrDescription;
};
