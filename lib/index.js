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

const checkFragments = require('./transforms/checkFragments');

const TapRender = require('tap-render');

const t = new TapRender();

function regexEscape(pattern) {
    return pattern.replace(/[\.\+\{\}\[\]\(\)\?\^\$]/g, '\\$&').replace(/\*/g, '.*?');
}

module.exports = async function (options) {
    options = options || {};

    let errorCount = 0;
    const ag = new AssetGraph({
        root: options.root,
        canonicalRoot: options.canonicalRoot
    });

    ag.teepee.headers['User-Agent'] = 'Hyperlink v' + version + ' (https://www.npmjs.com/package/hyperlink)';
    ag.teepee.timeout = 30000;

    let excludePattern;

    if (Array.isArray(options.excludePatterns)) {
        excludePattern = new RegExp('^(:?' + options.excludePatterns.map(regexEscape).join('|') + ')');
    }

    function shouldSkip(url) {
        if (excludePattern) {
            return excludePattern.test(url);
        }

        return false;
    }

    const relationTypeExclusions = [
        'HtmlPreconnectLink'
    ];

    if (!options.recursive) {
        relationTypeExclusions.push('HtmlAnchor');
    }

    if (!options.followSourceMaps) {
        relationTypeExclusions.push('SourceMapFile', 'SourceMapSource');
    }

    function logResult(status, url, redirects, relations) {
        redirects = redirects || [];
        relations = relations || [];

        const at = _.uniq(relations.map(relationDebugDescription)).join('\n        ');
        const skip = shouldSkip(url);

        if (status === false) {
            errorCount += 1;
            t.push(null, {
                ok: false,
                skip,
                name: 'should accept connections',
                operator: 'error',
                expected: ['connection accepted', url].join(' '),
                actual: [status, url].join(' '),
                at
            });
        } else if (status !== 200 && status !== true) {
            errorCount += 1;
            t.push(null, {
                ok: false,
                skip,
                name: 'should respond with HTTP status 200',
                operator: 'error',
                expected: [200, url].join(' '),
                actual: [status, url].join(' '),
                at
            });
        }

        if (typeof status !== 'boolean') {
            const report = {
                ok: true,
                skip,
                name: 'URI should have no redirects - ' + url,
                operator: 'noRedirects',
                expected: [200, url].join(' '),
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
                    redirect => [redirect.statusCode, redirect.redirectUri].join(' ')
                ).join(' --> ');

                report.actual = logLine;

                if (log[0].statusCode !== 302) {
                    report.ok = false;
                }
            } else {
                report.actual = [status, url].join(' ');
            }

            if (!report.ok) {
                errorCount += 1;
            }
            t.push(null, report);
        }

        // Check for mixed-content warnings
        const secureSourceRelations = relations.filter(
            relation => relation.type !== 'HtmlAnchor' && relation.from.nonInlineAncestor.url.indexOf('https:') === 0
        );

        if (secureSourceRelations.length > 0) {
            const hasSecureTarget = /^(?:https:)?\/\//.test(url) && redirects.every(
                redirect => /^(?:https:)?\/\//.test(redirect.redirectUri)
            );

            if (!hasSecureTarget) {
                const insecureLog = [{ redirectUri: url }, ...redirects].map((item, idx, arr) => {
                    if (arr[idx + 1]) {
                        item.statusCode = arr[idx + 1].statusCode;
                    } else {
                        item.statusCode = 200;
                    }

                    return item;
                });

                const insecureLogLine = insecureLog.map(
                    redirect => redirect.redirectUri
                ).join(' --> ');

                const insecureReport = {
                    ok: false,
                    skip,
                    name: 'URI should be secure - ' + url,
                    operator: 'mixed-content',
                    expected: insecureLogLine.replace(/\bhttps?:/g, 'https:'),
                    actual: insecureLogLine,
                    at
                };

                t.push(null, insecureReport);
            }
        }
    }

    function tryConnect(url, relations, attempt) {
        const urlObj = urlModule.parse(url);
        const hostname = urlObj.hostname;
        const isTls = urlObj.protocol === 'https:';
        const port = urlObj.port ? parseInt(urlObj.port, 10) : (isTls ? 443 : 80);
        attempt = attempt || 1;
        return callback => {
            (isTls ? tls : net).connect(port, hostname, () => {
                logResult(true, url, undefined, relations);

                callback(undefined, true);
            }).on('error', error => {
                const code = error.code;
                let status = false;
                if (code) {
                    // Some servers send responses that request apparently handles badly when using the HEAD method...
                    if (code === 'HPE_INVALID_CONSTANT' && attempt === 1) {
                        return tryConnect(url, relations, attempt + 1)(callback);
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

                callback(undefined, false);
            });
        };
    }

    function httpStatus(url, relations, attempt) {
        attempt = attempt || 1;

        return callback => {
            request({
                method: attempt === 1 ? 'head' : 'get',
                url: url.replace(/#.*$/, ''),
                strictSSL: true,
                gzip: true,
                headers: {
                    'User-Agent': 'Hyperlink v' + version + ' (https://www.npmjs.com/package/hyperlink)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, sdch, br'
                }
            }, (error, res) => {
                let status;
                let redirects;

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
                    if (attempt === 2 && res.statusCode >= 400 && res.statusCode < 600) {
                        setTimeout(
                            () => httpStatus(url, relations, attempt + 1)(callback),
                            1000
                        );
                        return;
                    }

                    status = res.statusCode;
                    redirects = res.request.redirects || [];
                    const firstRedirectStatus = redirects[0] && redirects[0].statusCode;

                    logResult(status, url, redirects, relations);

                    callback(undefined, firstRedirectStatus || status);
                }

            });
        };
    }

    ag.on('addAsset', asset => {
        if (options.verbose) {
            console.error('addAsset', asset.toString());
        }

        // Try to conserve memory by immediately unloading assets found not
        // to have any outgoing relations (except Html which needs to be loaded
        // for the later #fragment checks to work):
        function unloadUnlessRelations() {
            asset.populate();
            if (!asset._outgoingRelations || asset._outgoingRelations.length === 0) {
                asset.unload();
                asset._rawSrc = new Buffer([]);
                asset._outgoingRelations = [];
            }
        }
        if (asset.type !== 'Html') {
            if (asset.isInline) {
                unloadUnlessRelations();
            } else {
                asset.once('load', unloadUnlessRelations);
            }
        }

        if (!asset.isInline) {
            t.push(null, {
                ok: true,
                name: 'loading ' + asset.urlOrDescription
            });
        }
    });

    ag.on('addRelation', relation => {
        if (options.verbose) {
            console.error('addRelation', relation.toString());
        }
    });

    function handleError(error) {
        const message = error.message || error;
        const asset = error.asset || (error.relation && error.relation.to);

        const report = {
            ok: false,
            name: ('Failed loading ' + (error.relation ? 'relation' : (asset && asset.urlOrDescription || 'asset'))),
            operator: 'error',
            actual: (asset && asset.urlOrDescription + ': ' || '') + message.split('\nIncluding assets:').shift()
        };

        if (error.asset) {
            const relation = error.asset.incomingRelations[0];

            if (relation) {
                report.at = relationDebugDescription(relation);
            }
        } else if (error.relation) {
            report.at = relationDebugDescription(error.relation);
        }

        if (error.stack) {
            report.actual.stack += error.stack;
        }

        errorCount += 1;

        t.push(null, report);
    }

    ag.on('warn', handleError);
    ag.on('error', handleError);

    let memoryUsageBefore;
    if (options.memdebug) {
        memoryUsageBefore = process.memoryUsage();
    }

    t.pipe(process.stdout);
    t.begin();

    t.push({
        name: 'Crawling internal assets'
    });

    try {
        const assetQueue = await ag.loadAssets(options.inputUrls);

        const processedAssets = new Set();
        async function processAsset(asset) {
            if (!processedAssets.has(asset)) {
                processedAssets.add(asset);
                try {
                    await asset.load();
                    for (const relation of asset.externalRelations) {
                        if (!relation.crossorigin && !relationTypeExclusions.includes(relation.type)) {
                            assetQueue.push(relation.to);
                        }
                    }
                } catch (err) {
                    handleError(err);
                }
            }
        }

        await new Promise(resolve => {
            let numInFlight = 0;
            (function proceed() {
                while (assetQueue.length > 0 && numInFlight < 100) {
                    numInFlight += 1;
                    processAsset(assetQueue.pop()).then(() => {
                        numInFlight -= 1;
                        proceed();
                    });
                }
                if (numInFlight === 0) {
                    resolve();
                }
            }());
        });

        await ag.queue(checkFragments(t));

        // Check urls
        const hrefMap = _.groupBy(ag.findRelations({
            crossorigin: true,
            href: /^(?:https?:)?\/\//,
            type: { $not: 'HtmlPreconnectLink' }
        }), relation => relation.to.url.replace(/#.*$/, ''));

        const hrefs = Object.keys(hrefMap);

        t.push({
            name: 'Crawling ' + hrefs.length + ' outgoing urls'
        });

        await new Promise((resolve, reject) => async.parallelLimit(
            hrefs.map(url => httpStatus(url, hrefMap[url])),
            20,
            err => {
                // console.error('Outgoing link status codes:');
                // console.error(_.countBy(results, function (r) { return r; }));

                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            }
        ));

        // Check preconnects:

        const preconnectHrefMap = _.groupBy(ag.findRelations({
            crossorigin: true,
            href: /^(?:https?:)?\/\//,
            type: 'HtmlPreconnectLink'
        }), relation => relation.to.url.replace(/#.*$/, ''));

        const preconnectHrefs = Object.keys(preconnectHrefMap);

        t.push({
            name: 'Connecting to ' + preconnectHrefs.length + ' hosts (checking <link rel="preconnect" href="...">'
        });

        await new Promise((resolve, reject) => async.parallelLimit(
            preconnectHrefs.map(function (url) {
                return tryConnect(url, hrefMap[url]);
            }),
            20,
            err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            }
        ));

        // await ag.writeStatsToStderr();

        const results = t.close();

        if (options.memdebug) {
            const memoryUsage = process.memoryUsage();

            for (const key of Object.keys(memoryUsage)) {
                console.error(key, prettyBytes(memoryUsage[key] - memoryUsageBefore[key]));
            }
        }
        process.exit(results.fail ? 1 : 0);
    } catch (err) {
        console.log(err.stack);
        process.exit(1);
    }
};
