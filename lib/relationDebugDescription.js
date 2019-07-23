module.exports = function relationDebugDescription(relation) {
  if (!relation || !relation.isRelation) {
    throw new Error(
      'relationDebugDescription: relation argument must be an AssetGraph.Relation instance'
    );
  }

  var asset = relation.from.nonInlineAncestor;

  if (asset.isText) {
    var text = asset.rawSrc.toString();
    var linesBefore = text.split(relation.href)[0].split('\n');
    var charsBefore = linesBefore[linesBefore.length - 1];

    var offsets = [linesBefore.length, charsBefore.length + 1].join(':');

    var details = '';

    var node = relation.node;

    if (relation.from.isInline && asset.type !== relation.from.type) {
      details += `(inlined ${relation.from.type}) `;
    }

    // DOM node
    if (node && node.outerHTML) {
      details += node.outerHTML
        .split('>' + node.innerHTML + '<')
        .join('>...<')
        .replace(/\n/g, '\\n');
    }

    // CSS node
    if (relation.propertyNode) {
      details += relation.propertyNode.value;
    }

    if (asset.url.indexOf('file:') === 0) {
      return [asset.urlOrDescription, offsets].join(':') + ' ' + details;
    }

    return asset.urlOrDescription + ' (' + offsets + ') ' + details;
  }

  return asset.urlOrDescription;
};
