var _ = require('lodash');
var AssetGraph = require('assetgraph');
var query = AssetGraph.query;
var async = require('async');
var request = require('request');
var version = require('../package.json').version;
var relationDebugDescription = require('./relationDebugDescription');
var prettyBytes = require('pretty-bytes');

var checkFragments = require('./transforms/checkFragments');

var TapRender = require('tap-render');

var t = new TapRender();

function regexEscape(pattern) {
    return pattern.replace(/[\.\+\{\}\[\]\(\)\?\^\$]/g, '\\$&').replace(/\*/g, '.*?');
}

module.exports = function (options) {
    options = options || {};

    var errorCount = 0;
    var ag = new AssetGraph({
        root: options.root,
        canonicalRoot: options.canonicalRoot
    });

    var excludePattern;

    if (Array.isArray(options.excludePatterns)) {
        excludePattern = new RegExp('^(:?' + options.excludePatterns.map(regexEscape).join('|') + ')');
    }

    function shouldSkip(url) {
        if (excludePattern) {
            return excludePattern.test(url);
        }

        return false;
    }

    var relationTypeExclusions = [
        'HtmlPreconnectLink'
    ];

    if (!options.recursive) {
        relationTypeExclusions.push('HtmlAnchor');
    }

    if (!options.followSourceMaps) {
        relationTypeExclusions.push('SourceMapFile', 'SourceMapSource');
    }

    var relationsQuery = {
        type: query.not(relationTypeExclusions),
        crossorigin: false
    };

    function logHttpResult(status, url, redirects, relations) {
        redirects = redirects || [];
        relations = relations || [];

        var at = _.uniq(relations.map(relationDebugDescription)).join('\n        ');
        var skip = shouldSkip(url);

        if (status !== 200) {
            var invalidStatusReport = {
                ok: false,
                skip: skip,
                name: 'should respond with HTTP status 200',
                operator: 'error',
                expected: [200, url].join(' '),
                actual: [status, url].join(' '),
                at: at
            };

            errorCount += 1;
            t.push(null, invalidStatusReport);
        }

        var report = {
            ok: true,
            skip: skip,
            name: 'URI should have no redirects - ' + url,
            operator: 'noRedirects',
            expected: [200, url].join(' '),
            at: at
        };

        if (redirects.length) {
            var log = [].concat({ redirectUri: url }, redirects).map(function (item, idx, arr) {
                if (arr[idx + 1]) {
                    item.statusCode = arr[idx + 1].statusCode;
                } else {
                    item.statusCode = 200;
                }

                return item;
            });

            var logLine = log.map(function (redirect) {
                return [redirect.statusCode, redirect.redirectUri].join(' ');
            }).join(' --> ');

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

        // Check for mixed-content warnings
        var secureSourceRelations = relations.filter(function (relation) {
            return relation.type !== 'HtmlAnchor' && relation.from.nonInlineAncestor.url.indexOf('https:') === 0;
        });

        if (secureSourceRelations.length > 0) {
            var hasSecureTarget = /^(?:https:)?\/\//.test(url) && redirects.every(function (redirect) {
                return /^(?:https:)?\/\//.test(redirect.redirectUri);
            });

            if (!hasSecureTarget) {
                var insecureLog = [].concat({ redirectUri: url }, redirects).map(function (item, idx, arr) {
                    if (arr[idx + 1]) {
                        item.statusCode = arr[idx + 1].statusCode;
                    } else {
                        item.statusCode = 200;
                    }

                    return item;
                });

                var insecureLogLine = insecureLog.map(function (redirect) {
                    return redirect.redirectUri;
                }).join(' --> ');

                var insecureReport = {
                    ok: false,
                    skip: skip,
                    name: 'URI should be secure - ' + url,
                    operator: 'mixed-content',
                    expected: insecureLogLine.replace(/\bhttps?:/g, 'https:'),
                    actual: insecureLogLine,
                    at: at
                };

                t.push(null, insecureReport);
            }
        }
    }

    function httpStatus(url, relations, attempt) {
        attempt = attempt || 1;

        return function (callback) {
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
            }, function (error, res) {
                var status,
                    redirects;

                if (error) {
                    var code = error.code;

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

                    logHttpResult(status, url, undefined, relations);

                    callback(undefined, status);
                } else {
                    // Some servers respond weirdly to HEAD requests. Make a second attempt with GET
                    if (attempt === 1 && res.statusCode >= 400 && res.statusCode < 600) {
                        return httpStatus(url, relations, attempt + 1)(callback);
                    }

                    // Some servers (jspm.io) respond with 502 if requesting HEAD, then GET to close in succession. Give the server a second to cool down
                    if (attempt === 2 && res.statusCode >= 400 && res.statusCode < 600) {
                        setTimeout(function () {
                             httpStatus(url, relations, attempt + 1)(callback);
                        }, 1000);
                        return;
                    }

                    status = res.statusCode;
                    redirects = res.request.redirects || [];
                    var firstRedirectStatus = redirects[0] && redirects[0].statusCode;

                    logHttpResult(status, url, redirects, relations);

                    callback(undefined, firstRedirectStatus || status);
                }

            });
        };
    }

    ag.on('addAsset', function (asset) {
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

    ag.on('addRelation', function (relation) {
        if (options.verbose) {
            console.error('addRelation', relation.toString());
        }
    });

    function handleError(error) {
        var message = error.message || error;

        if (message.indexOf('AssetGraph.ensureAssetConfigHasType: Couldn\'t load') === 0) {
            return;
        }

        var asset = error.asset || (error.relation && error.relation.to);

        var report = {
            ok: false,
            name: ('Failed loading ' + (error.relation ? 'relation' : (asset && asset.urlOrDescription || 'asset'))),
            operator: 'error',
            actual: (asset && asset.urlOrDescription + ': ' || '') + message.split('\nIncluding assets:').shift()
        };

        if (error.asset) {
            var relation = error.asset.incomingRelations[0];

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

    var memoryUsageBefore;
    if (options.memdebug) {
        memoryUsageBefore = process.memoryUsage();
    }

    t.pipe(process.stdout);
    t.begin();

    t.push({
        name: 'Crawling internal assets'
    });

    ag.loadAssets(options.inputUrls)
        .populate({
            followRelations: relationsQuery,
            concurrency: options.concurrency || 100
        })
        .queue(checkFragments(t))
        .queue(function (assetGraph, callback) {
            var hrefMap = {};

            hrefMap = _.groupBy(assetGraph.findRelations({
                crossorigin: true,
                href: /^(?:https?:)?\/\//
            }, true), function (relation) {
                var url = relation.to.url.replace(/#.*$/, '');

                return url;
            });

            var hrefs = Object.keys(hrefMap);

            t.push({
                name: 'Crawling ' + hrefs.length + ' outgoing urls'
            });
            async.parallelLimit(
                hrefs.map(function (url) {
                    return httpStatus(url, hrefMap[url]);
                }),
                20,
                function (err) {
                    // console.error('Outgoing link status codes:');
                    // console.error(_.countBy(results, function (r) { return r; }));

                    callback(err);
                }
            );
        })
        // .writeStatsToStderr()
        .run(function () {
            var results = t.close();

            if (options.memdebug) {
                var memoryUsage = process.memoryUsage();

                Object.keys(memoryUsage).forEach(function (key) {
                    console.error(key, prettyBytes(memoryUsage[key] - memoryUsageBefore[key]));
                });
            }

            process.exit(results.fail ? 1 : 0);
        });
};
