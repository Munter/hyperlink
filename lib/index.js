const AssetGraph = require('assetgraph');
const asyncLib = require('async');
const request = require('request');
const extendWithSitemap = require('assetgraph-plugin-sitemap');
const version = require('../package.json').version;
const relationDebugDescription = require('./relationDebugDescription');
const getModifiedHref = require('./getModifiedHref');
const prettyBytes = require('pretty-bytes');
const net = require('net');
const tls = require('tls');

const defaultSkipFilters = [require('./known-culprits/linkedin')];

const hyperlinkUserAgent = `Hyperlink v${version} (https://www.npmjs.com/package/hyperlink)`;

const userContentFragmentOrigins = [
  'https://github.com',
  'https://www.npmjs.com',
];

function checkCompatibility(asset, Class) {
  if (typeof Class === 'undefined') {
    Class = AssetGraph.Asset;
  } else if (typeof Class === 'string') {
    Class = AssetGraph[Class];
  }
  return (
    asset instanceof Class ||
    !asset._type ||
    Class.prototype instanceof AssetGraph[asset._type] ||
    !!(asset.isImage && Class === AssetGraph.Image) || // Svg is modelled as a subclass of Xml, not Image
    !!(asset.isImage && Class === AssetGraph.Font) // Svg can be used as a font as well
  );
}

function returnFalse() {
  return false;
}

/**
 * A tap-render instance (https://www.npmjs.com/package/@munter/tap-render)
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
 * @param  {Boolean} [options.internalOnly = false] Only check links to assets within your own web root
 * @param  {Boolean} [options.pretty = false] Resolve extensionless links to their corresponding .html-file on disk
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
    internalOnly = false,
    pretty = false,
    followSourceMaps = false,
    verbose = false,
    memdebug = false,
    concurrency = 25,
  } = {},
  t
) {
  const ag = new AssetGraph({
    root,
    canonicalRoot,
  });

  extendWithSitemap(ag);

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
        ok: true,
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

    return (callback) => {
      if (shouldSkip(connectionReport)) {
        return setTimeout(callback);
      }

      const socket = (isTls ? tls : net)
        .connect(port, hostname, () => {
          reportTest({
            ...connectionReport,
            ok: true,
          });

          socket.destroy();

          callback();
        })
        .on('error', (error) => {
          const message = error.message;

          let actual = message || 'Unknown error';

          if (error.code === 'ENOTFOUND') {
            actual = `DNS missing: ${hostname}`;
          }

          reportTest({
            ...connectionReport,
            ok: false,
            actual,
          });

          callback();
        });
    };
  }

  function httpStatus(asset, attempt = 1) {
    const url = asset.url;
    const relations = asset._incoming;

    const loadReport = {
      operator: 'external-check',
      name: `external-check ${url}`,
      at: [...new Set(relations.map((r) => r.debugDescription))].join(
        '\n        '
      ),
      expected: `200 ${url}`,
    };

    return (callback) => {
      if (shouldSkip(loadReport)) {
        return setTimeout(callback);
      }

      request(
        {
          method: attempt === 1 ? 'head' : 'get',
          url: asset.url,
          strictSSL: true,
          gzip: true,
          headers: {
            'User-Agent': hyperlinkUserAgent,
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, sdch, br',
          },
        },
        (error, res) => {
          if (error) {
            const code = error.code;
            let actual = code || 'Unknown error';

            switch (code) {
              case 'ENOTFOUND':
                actual = `DNS missing: ${asset.hostname}`;
                break;
              case 'HPE_INVALID_CONSTANT':
                if (attempt === 1) {
                  return httpStatus(asset, attempt + 1)(callback);
                }
                break;
            }

            reportTest({
              ...loadReport,
              ok: false,
              actual,
            });

            return callback();
          }

          const status = res.statusCode;

          if (status >= 200 && status < 300) {
            const contentType = res.headers['content-type'];
            if (contentType && asset.type) {
              const matchContentType = contentType.match(
                /^\s*([\w\-+.]+\/[\w-+.]+)(?:\s|;|$)/i
              );
              if (matchContentType && asset.expectedTypes) {
                asset.contentType = matchContentType[1].toLowerCase();
                asset._inferredType = undefined;
                asset._tryUpgrade();
              }
            } else if (!contentType) {
              const contentTypeMisingReport = {
                ok: false,
                name: `content-type-missing ${asset.urlOrDescription}`,
                operator: 'content-type-missing',
                expected:
                  asset.contentType ||
                  `A Content-Type compatible with ${asset.type}`,
                actual: contentType,
                at: [...new Set(relations.map((r) => r.debugDescription))].join(
                  '\n        '
                ),
              };

              if (!shouldSkip(contentTypeMisingReport)) {
                reportTest(contentTypeMisingReport);
              }
            }
          }

          // Some servers respond weirdly to HEAD requests. Make a second attempt with GET
          if (attempt === 1 && status >= 400 && status < 600) {
            return httpStatus(asset, attempt + 1)(callback);
          }

          // Some servers (jspm.io) respond with 502 if requesting HEAD, then GET to close in succession. Give the server a second to cool down
          if (attempt === 2 && status === 502) {
            setTimeout(() => httpStatus(asset, attempt + 1)(callback), 1000);
            return;
          }

          const redirects = res.request._redirect.redirects;
          if (redirects.length > 0) {
            const log = [{ redirectUri: url }, ...redirects].map(
              (item, idx, arr) => {
                if (arr[idx + 1]) {
                  item.statusCode = arr[idx + 1].statusCode;
                } else {
                  item.statusCode = 200;
                }

                return item;
              }
            );

            const redirectReport = {
              operator: 'external-redirect',
              name: `external-redirect ${url}`,
              at: [...new Set(relations.map((r) => r.debugDescription))].join(
                '\n        '
              ),
              expected: `302 ${url} --> 200 ${log[log.length - 1].redirectUri}`,
            };

            const actual = log
              .map(
                (redirect) => `${redirect.statusCode} ${redirect.redirectUri}`
              )
              .join(' --> ');

            if (!shouldSkip(redirectReport)) {
              // A single temporary redirect is allowed
              if ([302, 307].includes(log[0].statusCode)) {
                if (log.length < 3) {
                  reportTest({
                    ...redirectReport,
                    expected: actual,
                    actual,
                    ok: true,
                  });
                } else {
                  reportTest({
                    ...redirectReport,
                    expected: `${log[0].statusCode} ${url} --> 200 ${
                      log[log.length - 1].redirectUri
                    }`,
                    actual,
                    ok: false,
                  });
                }
              } else {
                reportTest({
                  ...redirectReport,
                  actual,
                  ok: false,
                });
              }
            }
          }

          if (status === 200) {
            reportTest({
              ...loadReport,
              ok: true,
              actual: loadReport.expected,
            });

            return callback();
          }

          reportTest({
            ...loadReport,
            actual: `${status} ${url}`,
            ok: false,
          });

          return callback();
        }
      );
    };
  }

  if (verbose) {
    ag.on('addRelation', (relation) => {
      console.error('addRelation', relation.toString());
    });
    ag.on('addAsset', (asset) => {
      console.error('addAsset', asset.toString());
    });
  }

  function handleError(error) {
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
        message.split('\nIncluding assets:').shift(),
    };

    if (error.asset) {
      if (error.asset._incoming) {
        report.at = error.asset._incoming[0].debugDescription;
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
    name: 'Crawling internal assets',
  });

  // Would be nice for this information to be more easily accessible:
  const assetTypesWithoutRelations = Object.keys(AssetGraph).filter(
    (key) =>
      AssetGraph[key] &&
      AssetGraph[key].prototype &&
      AssetGraph[key].prototype.findOutgoingRelationsInParseTree ===
        AssetGraph.Asset.prototype.findOutgoingRelationsInParseTree
  );

  const assetQueue = ag.addAssets(inputUrls);
  const entrypoints = [...assetQueue];

  const processedAssets = new Set();
  const processedUrls = new Set();
  // eslint-disable-next-line no-inner-declarations
  async function processAsset(asset) {
    if (!processedUrls.has(asset.urlOrDescription)) {
      processedAssets.add(asset);
      processedUrls.add(asset.urlOrDescription);

      const loadReport = {
        operator: 'load',
        name: `load ${asset.urlOrDescription}`,
        expected: `200 ${asset.urlOrDescription}`,
      };

      if (asset._incoming && asset._incoming[0].debugDescription) {
        loadReport.at = asset._incoming[0].debugDescription;
      } else {
        loadReport.at = `${asset.urlOrDescription} (input URL)`;
      }

      if (shouldSkip(loadReport)) {
        return;
      }

      try {
        await asset.load();

        reportTest({
          ...loadReport,
          ok: true,
        });
      } catch (err) {
        const failedLoadReport = {
          ...loadReport,
          ok: false,
          actual: err.message,
        };

        // If configured, check for extensionless html file links.
        // Some web serves are configured to resolve these automatically
        if (
          pretty &&
          !entrypoints.includes(asset) &&
          asset.protocol === 'file:' &&
          asset.extension !== '.html'
        ) {
          const originalUrl = asset.url;

          const prettyUrl = asset.url.replace(/(\?|#|$)/, '.html$1');
          let prettyAsset = ag.findAssets({ url: prettyUrl })[0];
          if (!prettyAsset) {
            prettyAsset = ag.addAsset({
              url: prettyUrl,
            });
          }
          try {
            await prettyAsset.load();
            asset.isRedirect = true;
            asset.fileRedirectTargetUrl = prettyUrl;
          } catch (err) {
            reportTest(failedLoadReport);
            return;
          }

          reportTest({
            ...loadReport,
            ok: true,
          });
          asset.url = originalUrl;
        } else {
          reportTest(failedLoadReport);
          return;
        }
      }

      if (asset.isRedirect) {
        asset._redirectTarget = asset.outgoingRelations.find((relation) =>
          /Redirect$/.test(relation.type)
        ).to;
      }

      if (asset.type === 'Html') {
        // If this asset got into the graph through an unexpected relation, we need to guard against
        // treating it as a new entry point

        // Always process entry points
        if (!entrypoints.includes(asset)) {
          // Cross-origin should always stop the recursion
          // Same-origin should only recurse of configured to
          asset.stopProcessing =
            !asset.isRedirect && (asset.crossedOrigins || !recursive);
        }

        // Remember the set of names and ids in the document before unloading so incoming fragments can be checked:
        // See https://github.com/Munter/hyperlink/issues/160
        asset.ids = new Set();
        asset.names = new Set();
        if (asset.isLoaded && asset.parseTree) {
          for (const element of Array.from(
            asset.parseTree.querySelectorAll('[id]')
          )) {
            asset.ids.add(element.getAttribute('id'));
          }
          for (const element of Array.from(
            asset.parseTree.querySelectorAll('[name]')
          )) {
            asset.names.add(element.getAttribute('name'));
          }
        }
      }

      // In non-recursive mode local assets might be marked as end-of-line.
      // This is specifically relevant to local file-URLs
      if (asset.stopProcessing) {
        asset.unload();
        return;
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
        const fragment = relation.fragment;
        if (fragment) {
          if (fragment === '#') {
            const fragmentReport = {
              name: `fragment-check ${relation.from.urlOrDescription} --> ${relation.href}`,
              operator: 'fragment-check',
              expected:
                'Fragment identifiers in links to different documents should not be empty',
              at: relationDebugDescription(relation),
            };

            if (!shouldSkip(fragmentReport)) {
              if (relation.to !== asset) {
                reportTest({
                  ...fragmentReport,
                  ok: false,
                });
              }
            }
          } else {
            (relation.to.incomingFragments =
              relation.to.incomingFragments || []).push({
              fragment,
              relationDebugDescription: relationDebugDescription(relation),
              href: relation.href,
              fromUrlOrDescription: relation.from.urlOrDescription,
              fromUrl: relation.from.url,
            });
          }
        }
        if (!relation.to._incoming) {
          (relation.to._incoming = relation.to._incoming || []).push({
            type: relation.type,
            debugDescription: relationDebugDescription(relation),
          });
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
            actual: `${relation.from.urlOrDescription} --> ${href}`,
          };

          if (!shouldSkip(mixedContentReport)) {
            if (mixedContentReport.actual !== mixedContentReport.expected) {
              reportTest({
                ...mixedContentReport,
                ok: false,
              });
            } else {
              reportTest({
                ...mixedContentReport,
                ok: true,
              });
            }
          }
        }

        let follow;

        if (
          ['HtmlPreconnectLink', 'HtmlDnsPrefetchLink'].includes(relation.type)
        ) {
          follow = false;
          relation.to['check' + relation.type] = true;
        } else if (
          ['HtmlAnchor', 'SvgAnchor', 'HtmlIFrame'].includes(relation.type)
        ) {
          if (
            !relation.crossorigin &&
            !relation.from.crossedOrigins &&
            recursive
          ) {
            follow = true;
          } else if (relation.from !== relation.to) {
            // If we are handling local file-urls, follow but mark as end-of-line in processing
            if (
              !recursive &&
              relation.from.protocol === 'file:' &&
              relation.to.protocol === 'file:'
            ) {
              follow = true;
              relation.to.stopProcessing = true;
            } else if (!internalOnly) {
              if (relation.fragment && relation.fragment !== '#') {
                follow = true;
                relation.to.stopProcessing = true;
              } else {
                relation.to.check = true;
              }
            }
          }
        } else if (
          /^(?:JavaScript|Css)Source(?:Mapping)Url$/.test(relation.type)
        ) {
          if (followSourceMaps) {
            follow = true;
          } else {
            relation.to.check = true;
          }
        } else if (
          ['SourceMapFile', 'SourceMapSource'].includes(relation.type)
        ) {
          if (followSourceMaps) {
            relation.to.check = true;
          }
        } else if (relation.type === 'JavaScriptFetch') {
          follow = false;
        } else if (internalOnly) {
          follow = !relation.crossorigin;
        } else {
          follow = true;
        }

        if (follow) {
          // Save information about cross origin navigations for later
          relation.to.crossedOrigins =
            relation.crossorigin || relation.from.crossedOrigins;

          if (assetTypesWithoutRelations.includes(relation.to.type)) {
            // If we are handling local file-urls, follow but mark as end-of-line in processing
            if (
              relation.from.nonInlineAncestor.protocol === 'file:' &&
              relation.to.protocol === 'file:'
            ) {
              relation.to.stopProcessing = !recursive;
              assetQueue.push(relation.to);
            } else {
              relation.to.check = true;
            }
          } else {
            assetQueue.push(relation.to);
          }
        }
      }

      // Conserve memory by immediately unloading the asset:
      if (verbose) {
        reportTest({
          ok: true,
          name: `unloading ${asset.urlOrDescription}`,
        });
      }
      asset.unload();
    }
  }

  await new Promise((resolve) => {
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

  // Forward incomingFragments through redirects:
  for (const redirectAsset of ag.findAssets({ isRedirect: true })) {
    if (redirectAsset.incomingFragments) {
      const assetQueue = new Set([redirectAsset]);
      for (const asset of assetQueue) {
        if (asset._redirectTarget) {
          assetQueue.add(asset._redirectTarget);
        } else {
          if (
            typeof redirectAsset.statusCode === 'number' || // HttpRedirect
            !/\/(?:\?|$)/.test(redirectAsset.url)
          ) {
            for (const {
              fragment,
              href,
              fromUrl,
              relationDebugDescription,
              fromUrlOrDescription,
            } of redirectAsset.incomingFragments) {
              const to = redirectAsset._redirectTarget;
              const expected =
                getModifiedHref(href, fromUrl, to.url, ag.root).replace(
                  '/index.html',
                  '/'
                ) + fragment;

              const fragmentRedirectReport = {
                operator: 'fragment-redirect',
                name: `fragment-redirect ${fromUrlOrDescription} --> ${redirectAsset.urlOrDescription}${fragment} --> ${to.urlOrDescription}`,
                expected,
                actual: href,
                at: relationDebugDescription,
              };
              if (!shouldSkip(fragmentRedirectReport)) {
                reportTest({
                  ...fragmentRedirectReport,
                  ok: false,
                });
              }
            }
          }
          (asset.incomingFragments = asset.incomingFragments || []).push(
            ...redirectAsset.incomingFragments
          );
        }
      }
      delete redirectAsset.incomingFragments;
    }
  }

  // Check fragments

  for (const asset of ag.findAssets({
    type: 'Html',
    incomingFragments: { $exists: true },
    ids: { $exists: true },
  })) {
    for (const {
      fragment,
      relationDebugDescription,
      href,
      fromUrlOrDescription,
    } of asset.incomingFragments) {
      const fragmentId = fragment.substr(1);
      const fragmentReport = {
        operator: 'fragment-check',
        name: `fragment-check ${fromUrlOrDescription} --> ${href}`,
        expected: `id="${fragmentId}"`,
        at: relationDebugDescription,
      };

      if (!shouldSkip(fragmentReport)) {
        if (asset.ids.has(fragmentId)) {
          reportTest({
            ...fragmentReport,
            ok: true,
            actual: fragmentReport.expected,
          });
        } else {
          // Some hosts do weird things with mangling fragments and reversing it with runtime js
          if (
            userContentFragmentOrigins.includes(asset.origin) &&
            asset.ids.has(`user-content-${fragmentId}`)
          ) {
            reportTest({
              ...fragmentReport,
              ok: true,
              actual: `id="user-content-${fragmentId}"`,
            });
          } else {
            if (asset.names.has(fragmentId)) {
              reportTest({
                ...fragmentReport,
                ok: true,
                actual: `name="${fragmentId}"`,
              });
            } else {
              reportTest({
                ...fragmentReport,
                ok: false,
                actual: null,
              });
            }
          }
        }
      }
    }
  }

  // Check urls
  if (!internalOnly) {
    const assetsToCheck = ag
      .findAssets({ check: true })
      .filter((asset) => !processedAssets.has(asset));
    t.push({
      name: `Crawling ${assetsToCheck.length} outgoing urls`,
    });

    await new Promise((resolve, reject) =>
      asyncLib.parallelLimit(
        assetsToCheck.map((asset) => httpStatus(asset)),
        20,
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      )
    );
  }

  // Check Content-Type vs. incoming relation targetTypes:

  for (const asset of ag.findAssets({ expectedTypes: { $exists: true } })) {
    const incompatibleTypes = [...asset.expectedTypes].filter(
      (expectedType) => !checkCompatibility(asset, expectedType)
    );
    if (incompatibleTypes.length > 0) {
      const expected =
        asset.contentType || `A Content-Type compatible with ${asset.type}`;

      const contentTypeMismatchReport = {
        ok: false,
        operator: 'content-type-mismatch',
        name: `content-type-mismatch ${asset.urlOrDescription}`,
        expected,
        actual: `Asset is used as both ${[...incompatibleTypes, asset.type]
          .sort()
          .join(' and ')}`,
        at: [...new Set(asset._incoming.map((r) => r.debugDescription))].join(
          '\n        '
        ),
      };

      if (!shouldSkip(contentTypeMismatchReport)) {
        reportTest(contentTypeMismatchReport);
      }
    }
  }

  // Check preconnects:

  const preconnectAssetsToCheck = ag.findAssets({
    checkHtmlPreconnectLink: true,
  });

  t.push({
    name: `Connecting to ${preconnectAssetsToCheck.length} hosts (checking <link rel="preconnect" href="...">`,
  });

  await new Promise((resolve, reject) =>
    asyncLib.parallelLimit(
      preconnectAssetsToCheck.map((asset) =>
        tryConnect(asset, {
          operator: 'preconnect-check',
          name: `preconnect-check ${asset.url}`,
          at: [...new Set(asset._incoming.map((r) => r.debugDescription))].join(
            '\n        '
          ),
          expected: `connection accepted ${asset.url}`,
        })
      ),
      20,
      (err) => {
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
    checkHtmlDnsPrefetchLink: true,
  });

  t.push({
    name: `Looking up ${dnsPrefetchAssetsToCheck.length} host names (checking <link rel="dns-prefetch" href="...">`,
  });

  await new Promise((resolve, reject) =>
    asyncLib.parallelLimit(
      dnsPrefetchAssetsToCheck.map((asset) =>
        tryConnect(asset, {
          operator: 'dns-prefetch-check',
          name: `dns-prefetch-check ${asset.hostname}`,
          at: [...new Set(asset._incoming.map((r) => r.debugDescription))].join(
            '\n        '
          ),
          expected: `DNS exists ${asset.hostname}`,
        })
      ),
      20,
      (err) => {
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
