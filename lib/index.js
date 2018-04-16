const AssetGraph = require('assetgraph');
const async = require('async');
const version = require('../package.json').version;
const relationDebugDescription = require('./relationDebugDescription');
const prettyBytes = require('pretty-bytes');
const net = require('net');
const tls = require('tls');

const defaultSkipFilters = [require('./known-culprits/linkedin')];

const hyperlinkUserAgent = `Hyperlink v${version} (https://www.npmjs.com/package/hyperlink)`;

function returnFalse() {
  return false;
}

/**
 * A tap-render instance (https://www.npmjs.com/package/tap-render)
 *
 * @typedef {Object} TapRender
 * @property {function} pipe
 * @property {function} begin
 * @property {function} push
 * @property {function} close
 * @property {function} handleResult
 *
 * @return {stream} pause-stream instance (https://www.npmjs.com/package/pause-stream)
 */

/**
 * Hyperlink
 *
 * @param  {Object} options Hyperlink options
 * @param  {String} options.root AssetGraph instance root
 * @param  {String} [options.canonicalRoot] AssetGraph instance canonicalRoot
 * @param  {String[]} [options.inputUrls = ['index.html']] Files to start the population with
 * @param  {Function} [options.skipFilter] Filter function to mark failed tests as [skipped](https://testanything.org/tap-version-13-specification.html#skipping-tests). Return a `String` to add a message or `true` to just mark as skipped
 * @param  {Function} [options.todoFilter] Filter function to mark failed tests as [todo](https://testanything.org/tap-version-13-specification.html#todo-tests)'s. Return a `String` to add a message or `true` to just mark as todo
 * @param  {Boolean} [options.recursive = false] Recurse onto other pages within the root parameters origin
 * @param  {Boolean} [options.followSourceMaps = false] Check source maps
 * @param  {Boolean} [options.verbose = false] Verbose output from AssetGraph
 * @param  {Boolean} [options.memdebug = false] Memory debugging
 * @param  {Number} [options.concurrency = 25] Concurrency limit
 * @param  {TapRender} t tap-render instance
 * @return {AssetGraph}
 */
async function hyperlink(
  {
    root,
    canonicalRoot,
    inputUrls,
    skipFilter = returnFalse,
    todoFilter = returnFalse,
    recursive = false,
    followSourceMaps = false,
    verbose = false,
    memdebug = false,
    concurrency = 25
  } = {},
  t
) {
  const ag = new AssetGraph({
    root,
    canonicalRoot
  });

  ag.teepee.headers['User-Agent'] = hyperlinkUserAgent;
  ag.teepee.timeout = 30000;

  function shouldSkip(report) {
    let skip;

    for (const filter of defaultSkipFilters) {
      const message = filter(report);
      if (message) {
        skip = message;
      }
    }

    if (!skip) {
      try {
        skip = skipFilter(report);
      } catch (err) {
        console.error(err.stack);
        process.exit();
      }
    }

    if (skip === true || typeof skip === 'string') {
      t.push(null, {
        ...report,
        skip,
        ok: true
      });

      return true;
    }

    return false;
  }

  function reportTest(report) {
    if (report.ok) {
      t.push(null, report);
      return;
    }

    const todo = todoFilter(report);

    if (todo === true || typeof todo === 'string') {
      report.todo = todo;
    }

    t.push(null, report);
  }

  function tryConnect(asset, connectionReport) {
    const hostname = asset.hostname;
    const isTls = asset.protocol === 'https:';
    const port = asset.port ? parseInt(asset.port, 10) : isTls ? 443 : 80;

    return callback => {
      if (shouldSkip(connectionReport)) {
        return setTimeout(callback);
      }

      const socket = (isTls ? tls : net)
        .connect(port, hostname, () => {
          reportTest({
            ...connectionReport,
            ok: true
          });

          socket.destroy();

          callback();
        })
        .on('error', error => {
          const code = error.code;
          const message = error.message;

          let actual = message || 'Unknown error';

          switch (code) {
            case 'ENOTFOUND':
              actual = `DNS missing: ${hostname}`;
              break;
          }

          reportTest({
            ...connectionReport,
            ok: false,
            actual
          });

          callback();
        });
    };
  }

  if (verbose) {
    ag.on('addRelation', relation => {
      console.error('addRelation', relation.toString());
    });
    ag.on('addAsset', asset => {
      console.error('addAsset', asset.toString());
    });
  }

  function handleError(error) {
    // Detect and upgrade certain errors from AssetGraph:
    let operator;
    if (error.stack && error.stack.includes('_warnIncompatibleTypes')) {
      operator = 'content-type-mismatch';
    } else if (error.message === 'No Content-Type response header received') {
      operator = 'content-type-missing';
    }
    if (operator) {
      const asset = error.asset;
      const expected =
        asset.contentType || `A Content-Type compatible with ${asset.type}`;

      const contentTypeMismatchReport = {
        ok: false,
        operator,
        name: `${operator} ${asset.urlOrDescription}`,
        expected,
        actual: error.message,
        at: [
          ...new Set(asset.incomingRelations.map(relationDebugDescription))
        ].join('\n        ')
      };

      if (!shouldSkip(contentTypeMismatchReport)) {
        reportTest(contentTypeMismatchReport);
      }

      return;
    }
    const message = error.message || error;
    const asset = error.asset || (error.relation && error.relation.to);
    const report = {
      ok: false,
      name: `Failed loading ${
        error.relation
          ? 'relation'
          : (asset && asset.urlOrDescription) || 'asset'
      }`,
      operator: 'error',
      actual:
        ((asset && asset.urlOrDescription + ': ') || '') +
        message.split('\nIncluding assets:').shift()
    };

    if (error.asset) {
      if (error.asset.incomingRelalations.length > 0) {
        report.at = relationDebugDescription(error.asset.incomingRelations[0]);
      }
    } else if (error.relation) {
      report.at = relationDebugDescription(error.relation);
    }

    if (error.stack) {
      report.actual.stack += error.stack;
    }

    reportTest(report);
  }

  ag.on('warn', handleError);
  ag.on('error', handleError);

  if (memdebug) {
    setInterval(() => {
      const memoryUsage = process.memoryUsage();

      for (const key of Object.keys(memoryUsage)) {
        console.error(key, prettyBytes(memoryUsage[key]));
      }
    }, 5000);
  }

  t.begin();

  t.push({
    name: 'Crawling internal assets'
  });

  // Would be nice for this information to be more easily accessible:
  const assetTypesWithoutRelations = Object.keys(AssetGraph).filter(
    key =>
      AssetGraph[key] &&
      AssetGraph[key].prototype &&
      AssetGraph[key].prototype.findOutgoingRelationsInParseTree ===
        AssetGraph.Asset.prototype.findOutgoingRelationsInParseTree
  );

  const assetQueue = ag.addAssets(inputUrls);

  const processedAssets = new Set();
  // eslint-disable-next-line no-inner-declarations
  async function processAsset(asset) {
    if (!processedAssets.has(asset)) {
      processedAssets.add(asset);
      const operator = asset._metadataOnly ? 'external-check' : 'load';
      const loadReport = {
        operator,
        name: `${operator} ${asset.urlOrDescription}`,
        expected: `200 ${asset.urlOrDescription}`
      };

      if (asset.incomingRelations.length > 0) {
        loadReport.at = relationDebugDescription(asset.incomingRelations[0]);
      } else {
        loadReport.at = `${asset.urlOrDescription} (input URL)`;
      }

      if (shouldSkip(loadReport)) {
        return;
      }

      try {
        await asset.load({ metadataOnly: asset._metadataOnly });

        reportTest({
          ...loadReport,
          ok: true
        });
      } catch (err) {
        if (
          asset._metadataOnly &&
          err.statusCode &&
          err.statusCode >= 400 &&
          err.statusCode <= 600
        ) {
          try {
            await asset.load(); // Trigger a GET
          } catch (err) {
            reportTest({
              ...loadReport,
              ok: false,
              actual: err.message
            });
            return;
          }
        } else {
          reportTest({
            ...loadReport,
            ok: false,
            actual: err.message
          });
          return;
        }
      }

      for (const relation of asset.externalRelations) {
        // Only do work for supported protocols
        if (!['http:', 'https:', 'file:'].includes(relation.to.protocol)) {
          continue;
        }

        if (relation.targetType) {
          relation.to.expectedTypes = relation.to.expectedTypes || new Set();
          relation.to.expectedTypes.add(relation.targetType);
        }

        // Store a description of this incoming relation for future error messages
        // so that we can unload the source asset (destroying the relation):
        let fragment = relation.fragment;
        if (fragment) {
          if (fragment === '#') {
            const fragmentReport = {
              name: `fragment-check ${relation.from.urlOrDescription} --> ${
                relation.href
              }`,
              operator: 'fragment-check',
              expected:
                'Fragment identifiers in links to different documents should not be empty',
              at: relationDebugDescription(relation)
            };

            if (!shouldSkip(fragmentReport)) {
              if (relation.to !== asset) {
                reportTest({
                  ...fragmentReport,
                  ok: false
                });
              }
            }
          } else if (relation.to.type === 'Html') {
            (relation.to.incomingFragments =
              relation.to.incomingFragments || []).push({
              fragment,
              relationDebugDescription: relationDebugDescription(relation),
              href: relation.href,
              fromUrlOrDescription: relation.from.urlOrDescription
            });
          }
        }

        // Check for mixed-content warning:
        if (
          relation.from.nonInlineAncestor.protocol === 'https:' &&
          relation.to.protocol === 'http:' &&
          !['HtmlAnchor', 'SvgAnchor'].includes(relation.type)
        ) {
          const href = relation.href || relation.to.url;
          const mixedContentReport = {
            name: `mixed-content ${relation.from.urlOrDescription} --> ${href}`,
            operator: 'mixed-content',
            at: relationDebugDescription(relation),
            expected: `${relation.from.urlOrDescription} --> ${href.replace(
              /\bhttps?:/g,
              'https:'
            )}`,
            actual: `${relation.from.urlOrDescription} --> ${href}`
          };

          if (!shouldSkip(mixedContentReport)) {
            reportTest({
              ...mixedContentReport,
              ok: mixedContentReport.actual === mixedContentReport.expected
            });
          }
        }

        let follow;
        let metadataOnly = asset._metadataOnly;
        if (['HttpRedirect', 'FileRedirect'].includes(relation.type)) {
          follow = true;
        } else if (
          ['HtmlPreconnectLink', 'HtmlDnsPrefetchLink'].includes(relation.type)
        ) {
          follow = false;
          relation.to['check' + relation.type] = true;
        } else if (
          ['HtmlAnchor', 'SvgAnchor', 'HtmlIFrame'].includes(relation.type)
        ) {
          if (!relation.crossorigin && recursive) {
            follow = true;
          } else if (relation.from !== relation.to) {
            metadataOnly = true;
          }
        } else if (
          /^(?:JavaScript|Css)Source(?:Mapping)Url$/.test(relation.type)
        ) {
          if (followSourceMaps) {
            follow = true;
          } else {
            metadataOnly = true;
          }
        } else if (
          ['SourceMapFile', 'SourceMapSource'].includes(relation.type)
        ) {
          if (followSourceMaps) {
            metadataOnly = true;
          }
        } else {
          follow = true;
        }

        if (follow || metadataOnly) {
          if (assetTypesWithoutRelations.includes(relation.to.type)) {
            metadataOnly = true;
          } else {
            assetQueue.push(relation.to);
          }
          if (relation.to._metadataOnly && !metadataOnly) {
            // Make sure that we GET an asset that was previously only HEADed
            // now that a new relation came about
            processedAssets.delete(relation.to);
          }
          relation.to._metadataOnly = metadataOnly;
          assetQueue.push(relation.to);
        }
      }

      if (asset.type === 'Html' && !asset._metadataOnly) {
        // Remember the set of ids in the document before unloading so incoming fragments can be checked:
        asset.ids = new Set();
        for (const element of Array.from(
          asset.parseTree.querySelectorAll('[id]')
        )) {
          asset.ids.add(element.getAttribute('id'));
        }
      }

      // Conserve memory by immediately unloading the asset:
      if (verbose) {
        reportTest({
          ok: true,
          name: `unloading ${asset.urlOrDescription}`
        });
      }
      //      asset.unload();
    }
  }

  await new Promise(resolve => {
    let numInFlight = 0;
    (function proceed() {
      while (assetQueue.length > 0 && numInFlight < concurrency) {
        numInFlight += 1;
        processAsset(assetQueue.shift()).then(() => {
          numInFlight -= 1;
          proceed();
        });
      }
      if (numInFlight === 0) {
        resolve();
      }
    })();
  });

  // Check fragments

  for (const asset of ag.findAssets()) {
    if (asset.incomingFragments) {
      for (const {
        fragment,
        relationDebugDescription,
        href,
        fromUrlOrDescription
      } of asset.incomingFragments) {
        const fragmentReport = {
          operator: 'fragment-check',
          name: `fragment-check ${fromUrlOrDescription} --> ${href}`,
          expected: `id="${fragment.substr(1)}"`,
          at: relationDebugDescription
        };

        if (!shouldSkip(fragmentReport)) {
          if (!!asset.ids && asset.ids.has(fragment.substr(1))) {
            reportTest({
              ...fragmentReport,
              ok: true,
              actual: fragmentReport.expected
            });
          } else {
            reportTest({
              ...fragmentReport,
              ok: false,
              actual: null
            });
          }
        }
      }
    }
  }

  // Check redirects
  function checkRedirectChainFrom(asset, isCycle) {
    const redirectChain = [asset];
    let cursor = asset;
    cursor._processedRedirect = true;
    while (
      cursor.outgoingRelations.find(r => r.type === 'HttpRedirect') &&
      !redirectChain.includes(
        cursor.outgoingRelations.find(r => r.type === 'HttpRedirect').to
      )
    ) {
      cursor = cursor.outgoingRelations.find(r => r.type === 'HttpRedirect').to;
      cursor._processedRedirect = true;
      redirectChain.push(cursor);
    }
    let at;
    if (asset.incomingRelations.length > 0) {
      at = relationDebugDescription(asset.incomingRelations[0]);
    } else {
      at = `${asset.urlOrDescription} (input URL)`;
    }

    const redirectReport = {
      operator: 'external-redirect',
      name: `external-redirect ${asset.url}`,
      at,
      expected: `302 ${asset.url} --> 200 ${
        redirectChain[redirectChain.length - 1].url
      }`
    };

    if (!shouldSkip(redirectReport)) {
      // A single temporary redirect is allowed
      if (isCycle) {
        redirectChain.push(asset);
      }
      const actual = redirectChain
        .map(asset => `${asset.statusCode} ${asset.url}`)
        .join(' --> ');

      if (isCycle) {
        reportTest({
          ...redirectReport,
          operator: 'redirect-cycle',
          actual,
          ok: false
        });
      } else if ([302, 307].includes(redirectChain[0].statusCode)) {
        if (redirectChain.length < 3) {
          reportTest({
            ...redirectReport,
            expected: actual,
            actual,
            ok: true
          });
        } else {
          reportTest({
            ...redirectReport,
            expected: `${redirectChain[0].statusCode} ${asset.url} --> 200 ${
              redirectChain[redirectChain.length - 1].url
            }`,
            actual,
            ok: false
          });
        }
      } else {
        reportTest({
          ...redirectReport,
          actual,
          ok: false
        });
      }
    }
  }

  for (const asset of ag.findAssets({
    outgoingRelations: { $elemMatch: { type: 'HttpRedirect' } },
    incomingRelations: { $not: { $elemMatch: { type: 'HttpRedirect' } } }
  })) {
    checkRedirectChainFrom(asset);
  }

  // The redirects without _processedRedirect:true at this
  // point participate in at least one cycle:
  for (const asset of ag
    .findAssets({
      outgoingRelations: { $elemMatch: { type: 'HttpRedirect' } },
      _processedRedirect: { $ne: true }
    })
    .sort((a, b) => parseInt(a.id) - parseInt(b.id))) {
    if (!asset._processedRedirect) {
      checkRedirectChainFrom(asset, true);
    }
  }

  // Check Content-Type vs. incoming relation targetTypes:

  for (const asset of ag.findAssets({ expectedTypes: { $exists: true } })) {
    const incompatibleTypes = [...asset.expectedTypes].filter(
      expectedType => !asset._isCompatibleWith(expectedType)
    );
    if (incompatibleTypes.length > 0) {
      asset._warnIncompatibleTypes([...incompatibleTypes, asset.type]);
    }
  }

  // Check preconnects:

  const preconnectAssetsToCheck = ag.findAssets({
    checkHtmlPreconnectLink: true
  });

  t.push({
    name: `Connecting to ${
      preconnectAssetsToCheck.length
    } hosts (checking <link rel="preconnect" href="...">`
  });

  await new Promise((resolve, reject) =>
    async.parallelLimit(
      preconnectAssetsToCheck.map(asset =>
        tryConnect(asset, {
          operator: 'preconnect-check',
          name: `preconnect-check ${asset.url}`,
          at: [
            ...new Set(asset.incomingRelations.map(relationDebugDescription))
          ].join('\n        '),
          expected: `connection accepted ${asset.url}`
        })
      ),
      20,
      err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    )
  );

  // Check dns-prefetches:

  const dnsPrefetchAssetsToCheck = ag.findAssets({
    checkHtmlDnsPrefetchLink: true
  });

  t.push({
    name: `Looking up ${
      dnsPrefetchAssetsToCheck.length
    } host names (checking <link rel="dns-prefetch" href="...">`
  });

  await new Promise((resolve, reject) =>
    async.parallelLimit(
      dnsPrefetchAssetsToCheck.map(asset =>
        tryConnect(asset, {
          operator: 'dns-prefetch-check',
          name: `dns-prefetch-check ${asset.hostname}`,
          at: [
            ...new Set(asset.incomingRelations.map(relationDebugDescription))
          ].join('\n        '),
          expected: `DNS exists ${asset.hostname}`
        })
      ),
      20,
      err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    )
  );

  return ag;
}

module.exports = hyperlink;
