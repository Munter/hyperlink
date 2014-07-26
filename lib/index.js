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

    var assets = 0;
    var relations = 0;
    var history = [];

    function log() {
        // process.stdout.((new Array(80)).join(' ') + '\r');
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        history.push(Array.prototype.slice.apply(arguments));
        console.error.apply(console, arguments);
        logStats();
    }
    function logStats() {
        process.stdout.write('Assets: ' + chalk.cyan(assets) + ', Relations: ' + chalk.cyan(relations) + '\r');
    }

    ag.on('addAsset', function (asset) {
        assets += 1;

        if (asset.url || options.verbose) {
            log('addAsset', asset.toString());
        } else {
            logStats();
        }
    });

    ag.on('addRelation', function (relation) {
        relations += 1;

        if (options.verbose) {
            log('addRelation', relation.toString());
        } else {
            logStats();
        }
    });

    // var url = require('url').parse('http://www.mntr.dk');
    // console.log(url);
    // require('request')({
    //     url: url,
    //     strictSSL: true,
    //     gzip: true,
    //     jar: true,
    //     followRedirects: true
    // }, function (error, response, body) {
    //     console.log(response.request.redirects);
    // });

    ag.loadAssets(options.inputUrls)
        // Only follow redirects at first. The domain might change and we need the updated one for later
        .populate({
            followRelations: {
                type: 'HttpRedirect'
            }
        })
        // .queue(function (assetGraph, callback) {
        //     var assets = assetGraph.findAssets().map(function (a) {
        //         return a.statusCode + ' ' + a.urlOrDescription;
        //     });

        //     console.log('Assets:', assets.join('\n\t'));

        //     callback();
        // })
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


