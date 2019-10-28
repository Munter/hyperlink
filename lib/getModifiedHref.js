const { hrefTypes, getHrefType } = require('assetgraph/lib/util/getHrefType');
const {
  buildRootRelativeUrl,
  buildProtocolRelativeUrl,
  buildRelativeUrl
} = require('urltools');

function getModifiedHref(href, from, to, root) {
  switch (getHrefType(href)) {
    case hrefTypes.ABSOLUTE:
      return to;
    case hrefTypes.PROTOCOL_RELATIVE:
      return buildProtocolRelativeUrl(from, to);
    case hrefTypes.ROOT_RELATIVE:
      return buildRootRelativeUrl(from, to, root);
    case hrefTypes.RELATIVE:
      return buildRelativeUrl(from, to);
  }
}

module.exports = getModifiedHref;
