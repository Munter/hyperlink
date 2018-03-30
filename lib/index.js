const _ = require('lodash');
const AssetGraph = require('assetgraph');
const async = require('async');
const request = require('request');
const version = require('../package.json').version;
const relationDebugDescription = require('./relationDebugDescription');
const prettyBytes = require('pretty-bytes');
const urlModule = require('url');
const net = require('net');
const tls = require('tls');

const hyperlinkUserAgent = `Hyperlink v${version} (https://www.npmjs.com/package/hyperlink)`

function returnFalse() { return false; }

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
async function hyperlink({
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
} = {}, t) {
    const ag = new AssetGraph({
        root,
        canonicalRoot
    });

    ag.teepee.headers['User-Agent'] = hyperlinkUserAgent;
    ag.teepee.timeout = 30000;

    function shouldSkip(report) {
        let skip;
        try {
            skip = skipFilter(report);
        } catch (err) {
            console.error(err.stack);
            process.exit();
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
            return
        }

        const todo = todoFilter(report);

        if (todo === true || typeof todo === 'string') {
            report.todo = todo;
        }

        t.push(null, report);
    }

    function logResult(status, url, redirects = [], incoming = []) {
        const at = _.uniq(incoming.map(r => r.debugDescription)).join('\n        ');

        if (status === false) {
            reportTest({
                ok: false,
                name: 'should accept connections',
                operator: 'error',
                expected: `connection accepted ${url}`,
                actual: `${status} ${url}`,
                at
            });
        } else if (status !== 200 && status !== true) {
            reportTest({
                ok: false,
                name: 'should respond with HTTP status 200',
                operator: 'error',
                expected: `200 ${url}`,
                actual: `${status} ${url}`,
                at
            });
        }

        if (typeof status !== 'boolean') {
            const report = {
                ok: true,
                name: `URI should have no redirects - ${url}`,
                operator: 'noRedirects',
                expected: `200 ${url}`,
                at
            };

            if (redirects.length) {
                const log = [{ redirectUri: url }, ...redirects].map((item, idx, arr) => {
                    if (arr[idx + 1]) {
                        item.statusCode = arr[idx + 1].statusCode;
                    } else {
                        item.statusCode = 200;
                    }

                    return item;
                });

                const logLine = log.map(
                    redirect => `${redirect.statusCode} ${redirect.redirectUri}`
                ).join(' --> ');

                report.actual = logLine;

                if (log[0].statusCode !== 302) {
                    report.ok = false;
                }
            } else {
                report.actual = `${status} ${url}`;
            }

            reportTest(report);
        }
    }

    function tryConnect(url, incoming, connectionReport) {
        const urlObj = urlModule.parse(url);
        const hostname = urlObj.hostname;
        const isTls = urlObj.protocol === 'https:';
        const port = urlObj.port ? parseInt(urlObj.port, 10) : (isTls ? 443 : 80);

        if (shouldSkip(connectionReport)) {
            return callback => callback(undefined, true);
        }

        return callback => {
            const socket = (isTls ? tls : net).connect(port, hostname, () => {
                reportTest({
                    ...connectionReport,
                    ok: true
                });

                socket.destroy();

                callback(undefined, true);
            }).on('error', error => {
                const code = error.code;
                const message = error.message;

                let actual;

                switch (code) {
                    case 'ENOTFOUND':
                        actual = `DNS missing: ${hostname}`;
                        break;
                    default:
                        actual = message || 'Unknown error';
                }

                reportTest({
                    ...connectionReport,
                    ok: false,
                    actual
                });

                callback(undefined, false);
            });
        };
    }

    function httpStatus(url, relations, attempt = 1) {
        return callback => {
            request({
                method: attempt === 1 ? 'head' : 'get',
                url: url.replace(/#.*$/, ''),
                strictSSL: true,
                gzip: true,
                headers: {
                    'User-Agent': hyperlinkUserAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, sdch, br'
                }
            }, (error, res) => {
                let status;

                if (error) {
                    const code = error.code;

                    if (code) {
                        // Some servers send responses that request apparently handles badly when using the HEAD method...
                        if (code === 'HPE_INVALID_CONSTANT' && attempt === 1) {
                            return httpStatus(url, relations, attempt + 1)(callback);
                        }

                        if (code === 'ENOTFOUND') {
                            status = 'DNS Missing';
                        } else {
                            status = code;
                        }
                    } else {
                        status = 'Unknown error';
                    }

                    logResult(status, url, undefined, relations);

                    callback(undefined, status);
                } else {
                    // Some servers respond weirdly to HEAD requests. Make a second attempt with GET
                    if (attempt === 1 && res.statusCode >= 400 && res.statusCode < 600) {
                        return httpStatus(url, relations, attempt + 1)(callback);
                    }

                    // Some servers (jspm.io) respond with 502 if requesting HEAD, then GET to close in succession. Give the server a second to cool down
                    if (attempt === 2 && res.statusCode === 502) {
                        setTimeout(
                            () => httpStatus(url, relations, attempt + 1)(callback),
                            1000
                        );
                        return;
                    }

                    status = res.statusCode;
                    const redirects = res.request._redirect.redirects || [];
                    const firstRedirectStatus = redirects[0] && redirects[0].statusCode;

                    logResult(status, url, redirects, relations);

                    callback(undefined, firstRedirectStatus || status);
                }

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
        const message = error.message || error;
        const asset = error.asset || (error.relation && error.relation.to);

        const report = {
            ok: false,
            name: `Failed loading ${error.relation ? 'relation' : (asset && asset.urlOrDescription || 'asset')}`,
            operator: 'error',
            actual: (asset && asset.urlOrDescription + ': ' || '') + message.split('\nIncluding assets:').shift()
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
        name: 'Crawling internal assets'
    });

    // Would be nice for this information to be more easily accessible:
    const assetTypesWithoutRelations = Object.keys(AssetGraph)
        .filter(
            key => AssetGraph[key] &&
                AssetGraph[key].prototype &&
                AssetGraph[key].prototype.findOutgoingRelationsInParseTree === AssetGraph.Asset.prototype.findOutgoingRelationsInParseTree
        );

    const assetQueue = await ag.loadAssets(inputUrls);

    const processedAssets = new Set();
    // eslint-disable-next-line no-inner-declarations
    async function processAsset(asset) {
        if (!processedAssets.has(asset)) {
            processedAssets.add(asset);
            const loadReport = {
                operator: 'load',
                name: `load ${asset.urlOrDescription}`
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
                    ok: true
                });
            } catch (err) {
                reportTest({
                    ...loadReport,
                    ok: false,
                    actual: (asset && asset.urlOrDescription + ': ' || '') + err.message.split('\nIncluding assets:').shift()
                });
                return;
            }
            for (const relation of asset.externalRelations) {
                // Store a description of this incoming relation for future error messages
                // so that we can unload the source asset (destroying the relation):
                let fragment = relation.fragment;
                if (fragment) {
                    if (fragment === '#') {
                        const fragmentReport = {
                            name: `fragment-check ${relation.from.urlOrDescription} --> ${relation.href}`,
                            operator: 'fragment-check',
                            expected: 'Fragment identifiers in links to different documents should not be empty',
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
                        (relation.to.incomingFragments = relation.to.incomingFragments || []).push({
                            fragment,
                            relationDebugDescription: relationDebugDescription(relation),
                            href: relation.href,
                            fromUrlOrDescription: relation.from.urlOrDescription
                        });
                    }
                }
                if (!relation.to._incoming) {
                    (relation.to._incoming = relation.to._incoming || []).push(
                        {
                            type: relation.type,
                            debugDescription: relationDebugDescription(relation)
                        }
                    );
                }

                // Check for mixed-content warning:
                if (relation.from.nonInlineAncestor.protocol === 'https:' && relation.to.protocol === 'http:' && !['HtmlAnchor', 'SvgAnchor'].includes(relation.type)) {
                    const href = relation.href || relation.to.url;
                    const mixedContentReport = {
                        name: `mixed-content ${relation.from.urlOrDescription} --> ${href}`,
                        operator: 'mixed-content',
                        at: relationDebugDescription(relation),
                        expected: `${relation.from.urlOrDescription} --> ${href.replace(/\bhttps?:/g, 'https:')}`,
                        actual: `${relation.from.urlOrDescription} --> ${href}`
                    };

                    if(!shouldSkip(mixedContentReport)) {
                        if (mixedContentReport.actual !== mixedContentReport.expected) {
                            reportTest({
                                ...mixedContentReport,
                                ok: false
                            });
                        } else {
                            reportTest({
                                ...mixedContentReport,
                                ok: true
                            });
                        }
                    }
                }

                let follow;
                if (['HtmlPreconnectLink', 'HtmlDnsPrefetchLink'].includes(relation.type)) {
                    follow = false;
                    relation.to['check' + relation.type] = true;
                } else if (['HtmlAnchor', 'SvgAnchor', 'HtmlIFrame'].includes(relation.type)) {
                    if (!relation.crossorigin && recursive) {
                        follow = true;
                    } else if (relation.from !== relation.to) {
                        relation.to.check = true;
                    }
                } else if (/^(?:JavaScript|Css)Source(?:Mapping)Url$/.test(relation.type)) {
                    if (followSourceMaps) {
                        follow = true;
                    } else {
                        relation.to.check = true;
                    }
                } else if (['SourceMapFile', 'SourceMapSource'].includes(relation.type)) {
                    if (followSourceMaps) {
                        relation.to.check = true;
                    }
                } else {
                    follow = true;
                }
                if (follow) {
                    if (assetTypesWithoutRelations.includes(relation.to.type)) {
                        relation.to.check = true;
                    } else {
                        assetQueue.push(relation.to);
                    }
                }
            }

            if (asset.type === 'Html') {
                // Remember the set of ids in the document before unloading so incoming fragments can be checked:
                asset.ids = new Set();
                for (const element of Array.from(asset.parseTree.querySelectorAll('[id]'))) {
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
            asset.unload();
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
        }());
    });

    // Check fragments

    for (const asset of ag.findAssets()) {
        if (asset.incomingFragments) {
            for (const { fragment, relationDebugDescription, href, fromUrlOrDescription } of asset.incomingFragments) {

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

    // Check urls
    const assetsToCheck = ag.findAssets({check: true}).filter(asset => !processedAssets.has(asset));
    t.push({
        name: `Crawling ${assetsToCheck.length} outgoing urls`
    });

    await new Promise((resolve, reject) => async.parallelLimit(
        assetsToCheck
            .filter(asset => !shouldSkip({
                operator: 'external-check',
                name: `external-check ${asset.url}`,
                at: [...new Set(asset._incoming.map(r => r.debugDescription))].join('\n        ')
            }))
            .map(asset => httpStatus(asset.url, asset._incoming)),
        20,
        err => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        }
    ));

    // Check preconnects:

    const preconnectAssetsToCheck = ag.findAssets({checkHtmlPreconnectLink: true});

    t.push({
        name: `Connecting to ${preconnectAssetsToCheck.length} hosts (checking <link rel="preconnect" href="...">`
    });

    await new Promise((resolve, reject) => async.parallelLimit(
        preconnectAssetsToCheck
            .map(asset => tryConnect(asset.url, asset._incoming, {
                operator: 'preconnect-check',
                name: `preconnect-check ${asset.url}`,
                at: [...new Set(asset._incoming.map(r => r.debugDescription))].join('\n        '),
                expected: `connection accepted ${asset.url}`
            })),
        20,
        err => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        }
    ));

    // Check dns-prefetches:

    const dnsPrefetchAssetsToCheck = ag.findAssets({checkHtmlDnsPrefetchLink: true});

    t.push({
        name: `Looking up ${dnsPrefetchAssetsToCheck.length} host names (checking <link rel="dns-prefetch" href="...">`
    });

    await new Promise((resolve, reject) => async.parallelLimit(
        dnsPrefetchAssetsToCheck
            .map(asset => tryConnect(asset.url, asset._incoming, {
                operator: 'dns-prefetch-check',
                name: `dns-prefetch-check ${asset.hostname}`,
                at: [...new Set(asset._incoming.map(r => r.debugDescription))].join('\n        '),
                expected: `DNS exists ${asset.hostname}`
            })),
        20,
        err => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        }
    ));

    return ag;
};

 module.exports = hyperlink;
