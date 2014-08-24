var _ = require('lodash');
var AssetGraph = require('assetgraph');
var query = AssetGraph.query;
var async = require('async');
var request = require('request');
var chalk = require('chalk');


module.exports = function (options) {
    options = options || {};

    options.callback = options.callback || function () {};
    var ag = new AssetGraph({
        root: options.root
    });

    function colorStatus(status) {
        if (typeof status === 'number') {
            if (status < 300) {
                return chalk.green(status);
            } else if (status < 400) {
                return chalk.yellow(status);
            } else {
                return chalk.red(status);
            }
        } else {
            return chalk.red(status);
        }
    }

    function logHttpResult(status, url, redirects, relations) {
        redirects = redirects || [];
        relations = relations || [];

        if (status !== 200 || redirects.length || options.verbose) {
            if (redirects.length) {
                var realRedirects = [].concat({ redirectUri: url }, redirects).map(function (item, idx, arr) {
                    if (arr[idx + 1]) {
                        item.statusCode = arr[idx + 1].statusCode;
                    } else {
                        item.statusCode = 200;
                    }

                    return item;
                });

                var logLine = realRedirects.map(function (redirect) {
                    return colorStatus(redirect.statusCode) + ' ' + redirect.redirectUri;
                }).join(chalk.yellow(' --> '));

                log(logLine);
            } else {
                log(colorStatus(status), url);
            }

            _.uniq(relations.map(function (relation) {
                return relation.from.urlOrDescription.replace(/#.*$/, '');
            })).forEach(function (url) {
                log('\t' + chalk.cyan(url));
            });
        }
    }

    function httpStatus(url, relations) {
        return function (callback) {
            request({
                url: url.replace(/#.*$/, ''),
                strictSSL: true,
                gzip: true
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

    var history = [];

    var pages = 0,
        assets = 0,
        externalPages = 0,
        externalAssets = 0;

    function log() {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        history.push(Array.prototype.slice.apply(arguments));
        console.error.apply(console, arguments);
        logStats();
    }

    function leftPad(str, width, ch) {
        str = String(str);
        ch = ch || ' ';
        while (str.length < width) {
            str = ch + str;
        }
        return str;
    }

    function logStats() {
        process.stdout.write('\rInternal Pages: _pages_, Internal Assets: _assets_, External Pages: _externalPages_, External Assets: _externalAssets_'
            .replace('_pages_', chalk.cyan(leftPad(pages, 4)))
            .replace('_assets_', chalk.cyan(leftPad(assets, 4)))
            .replace('_externalPages_', chalk.cyan(leftPad(externalPages, 4)))
            .replace('_externalAssets_', chalk.cyan(leftPad(externalAssets, 4)))
        );
    }

    ag.on('addAsset', function (asset) {
        if (!asset.isInline && !asset.isRedirect) {
            if (asset.url.indexOf(ag.root)) {
                if (asset.type === 'Html') {
                    pages += 1;
                } else {
                    assets += 1;
                }
            } else {
                if (asset.type === 'Html') {
                    externalPages += 1;
                } else {
                    externalAssets += 1;
                }
            }
        }
        assets += 1;
        if (asset.url || options.verbose) {
            log('addAsset', asset.toString());
        } else {
            logStats();
        }
    });

    ag.on('addRelation', function (relation) {
        if (options.verbose) {
            log('addRelation', relation.toString());
        } else {
            logStats();
        }
    });

    ag.loadAssets(options.inputUrls)
        // Only follow redirects at first in case the initial URL is a redirect
        .populate({
            followRelations: {
                type: 'HttpRedirect'
            }
        })
        .queue(function (assetGraph, callback) {
            var initials = assetGraph.findAssets({
                type: 'Html',
                isFragment: false,
                isInline: false,
                isRedirect: false
            });

            var nonFileInitials = initials.filter(function (asset) {
                return !/^file:/.test(asset.root);
            });

            if (nonFileInitials.length > 0) {
                var urlObj = require('url').parse(nonFileInitials[0].url);
                assetGraph.root = urlObj.protocol + '//' + urlObj.host + '/';
                console.log('resetting root to', assetGraph.root);
            }

            assetGraph.on('addAsset', function (asset) {
                if (!asset.isInline && asset.url.indexOf(ag.root) === -1) {
                    asset.keepUnpopulated = true;
                }
            });

            callback();
        })
        .queue(function (assetGraph, callback) {
            var relationsQuery = {
                followRelations: query.or({
                    type: query.not('HtmlAnchor'),
                    hrefType: ['relative', 'rootRelative']
                },
                {
                    type: 'HttpRedirect'
                })
            };

            if (options.recursive) {
                relationsQuery = {
                    followRelations: query.or({
                        to: {
                            url: function (url) {
                                return url && url.indexOf(assetGraph.root) === 0;
                            }
                        }
                    },
                    {
                        type: 'HttpRedirect'
                    },
                    {
                        from: {
                            url: function (url) {
                                return url && url.indexOf(assetGraph.root) === 0;
                            }
                        }
                    })
                };
                console.log('updated relationsQuery, proceeding');
            }
            assetGraph.populate(relationsQuery).run(callback);
        })
        .queue(function (assetGraph, callback) {
            var statusGroups = _.groupBy(assetGraph.findAssets(query.or({
                isInline: false
            },
            {
                isRedirect: true
        })), function (asset) {
                return asset.statusCode;
            });

            Object.keys(statusGroups).forEach(function (key) {
                statusGroups[key] = statusGroups[key].map(function (asset) {
                    return asset.url;
                });
            });

            log(statusGroups);
        })
        // .queue(function (assetGraph, callback) {
        //     var hrefMap = {};

        //     hrefMap = _.groupBy(assetGraph.findRelations({
        //         hrefType: ['absolute', 'protocolRelative'],
        //         href: /^(?:https?:\/\/)/
        //     }, true), function (relation) {
        //         var url = relation.href.replace(/#.*$/, '');

        //         if (relation.hrefType === 'protocolRelative') {
        //             url = 'http:' + url;
        //         }

        //         return url;
        //     });

        //     var hrefs = Object.keys(hrefMap);

        //     log('Crawling ' + hrefs.length + ' outgoing urls:');
        //     async.parallelLimit(
        //         hrefs.map(function (url) {
        //             return httpStatus(url, hrefMap[url]);
        //         }),
        //         100,
        //         function (err, results) {
        //             log('Outgoing link status codes:');
        //             log(_.countBy(results, function (r) { return r; }));

        //             callback(err);
        //         }
        //     );
        // })
        // .queue(function (assetGraph, callback) {
        //     process.stdout.clearLine();
        //     callback();
        // })
        // .writeStatsToStderr()
        // .queue(function (assetgraph, callback) {
        //     // console.log(history.map(function (item) {
        //     //     return chalk.stripColor(item.join(' '));
        //     // }).join('\n'));

        //     callback();
        // })
        .run(options.callback);
};


