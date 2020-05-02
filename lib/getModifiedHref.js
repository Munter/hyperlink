const { hrefTypes, getHrefType } = require('hreftypes');
const {
  buildRootRelativeUrl,
  buildProtocolRelativeUrl,
  buildRelativeUrl,
} = require('urltools');

/**
 *
 * @param {string} href
 * @param {string} from
 * @param {string} to
 * @param {string} root
 *
 * @returns {string}
 */
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
