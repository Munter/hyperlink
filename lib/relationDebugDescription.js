module.exports = function relationDebugDescription(relation) {
    if (!relation || !relation.isRelation) {
        throw new Error('relationDebugDescription: relation argument must be an AssetGraph.Relation instance');
    }

    var asset = relation.from;

    if (asset.isText) {
        var text = asset.rawSrc.toString();
        var linesBefore = text.split(relation.href)[0].split('\n');
        var charsBefore = linesBefore[linesBefore.length - 1];

        var offsets = [linesBefore.length, charsBefore.length].join(':');

        if (asset.url.indexOf('file:') === 0) {
            return [asset.urlOrDescription, offsets].join(':');
        } else {
            return asset.urlOrDescription + ' (' + offsets + ')';
        }
    }

    return asset.urlOrDescription;
}
