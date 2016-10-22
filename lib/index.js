var _ = require('lodash');
var AssetGraph = require('assetgraph');
var query = AssetGraph.query;
var async = require('async');
var request = require('request');
var version = require('../package.json').version;

var checkFragments = require('./transforms/checkFragments');

var TapRender = require('tap-render');

var t = new TapRender();

module.exports = function (options) {
    options = options || {};

    var errorCount = 0;
    var ag = new AssetGraph({
        root: options.root
    });

    var relationsQuery = {
        type: query.not('HtmlAnchor'),
        crossorigin: false
    };

    if (options.recursive) {
        delete relationsQuery.type;
    }

    function logHttpResult(status, url, redirects, relations) {
        redirects = redirects || [];
        relations = relations || [];

        if (status !== 200) {
            var invalidStatusReport = {
                ok: false,
                name: 'should respond with HTTP status 200',
                operator: 'error',
                expected: [200, url].join(' '),
                actual: [status, url].join(' '),
                at: _.uniq(relations.map(function (relation) {
                    return relation.from.urlOrDescription;
                })).join('\n        ')
            };

            errorCount += 1;
            t.push(null, invalidStatusReport);
        }

        var report = {
            ok: true,
            name: 'URI should have no redirects - ' + url,
            operator: 'noRedirects',
            expected: [200, url].join(' '),
            at: _.uniq(relations.map(function (relation) {
                return relation.from.urlOrDescription;
            })).join('\n        ')
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
            var hasInsecureTarget = url.indexOf('https:') !== 0 || redirects.some(function (redirect) {
                return redirect.redirectUri.indexOf('https:') !== 0;
            });

            if (hasInsecureTarget) {
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
                    name: 'URI should be secure - ' + url,
                    operator: 'mixed-content',
                    expected: insecureLogLine.replace(/\bhttps?:/g, 'https:'),
                    actual: insecureLogLine,
                    at: _.uniq(relations.map(function (relation) {
                        return relation.from.urlOrDescription;
                    })).join('\n        ')
                };

                t.push(null, insecureReport);
            }
        }
    }

    function httpStatus(url, relations) {
        return function (callback) {
            request({
                url: url.replace(/#.*$/, ''),
                strictSSL: true,
                gzip: true,
                headers: {
                    'User-Agent': 'Hyperlink v' + version + ' (https://www.npmjs.com/package/hyperlink)'
                }
            }, function (error, res) {
                var status,
                    redirects;

                if (error) {
                    var code = error.code;

                    if (code) {
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

        var report = {
            ok: false,
            name: ('should not have any errors loading ' + (error.relation ? 'relation' : 'asset')),
            operator: 'error',
            actual: message
        };

        if (error.asset) {
            report.at = error.asset.urlOrDescription;
            if (error.line) {
                report.at += ':' + error.line;

                if (error.column) {
                    report.at += ':' + error.column;
                }
            }
        }

        if (error.relation) {
            report.at = error.relation.toString();
        }

        if (error.stack) {
            report.actual.stack += error.stack;
        }

        errorCount += 1;

        t.push(null, report);
    }

    ag.on('warn', handleError);
    ag.on('error', handleError);

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
                var url = relation.href.replace(/#.*$/, '');

                if (relation.hrefType === 'protocolRelative') {
                    url = 'http:' + url;
                }

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
            t.close();
            process.exit(errorCount ? 1 : 0);
        });
};
