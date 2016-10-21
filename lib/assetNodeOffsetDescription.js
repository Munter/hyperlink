module.exports = function assetNodeOffsetDescription(node, asset) {
    if (asset.type !== 'Html') {
        return '0:0';
    }

    var htmlString = asset.rawSrc.toString();
    var linesBeforeNode = htmlString.split(node.outerHTML)[0].split('\n');
    var charsBeforeNode = linesBeforeNode[linesBeforeNode.length - 1];

    return [asset.urlOrDescription, linesBeforeNode.length + 2, charsBeforeNode.length + 1].join(':') + ' (' + node.outerHTML + ')';
}
