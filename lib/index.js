var _ = require('lodash');
var AssetGraph = require('assetgraph');
var query = AssetGraph.query;
var async = require('async');
var request = require('request');
var chalk = require('chalk');


module.exports = function (options) {
    options = options || {};

    options.callback = options.callback || function () { console.warn('Done'); };
    var ag = new AssetGraph({
        root: options.root
    });

    var relationsQuery = {
        type: query.not('HtmlAnchor'),
        hrefType: ['relative', 'rootRelative']
    };

    if (options.recursive) {
        delete relationsQuery.type;
    }


    function colorStatus(status) {
        if (status < 300) {
            return chalk.green(status);
        } else if (status < 400) {
            return chalk.yellow(status);
        } else {
            return chalk.red(status);
        }
    }

    function logHttpResult(status, url, redirects, relations) {
        if (status !== 200 || redirects.length || options.verbose) {
            redirects.forEach(function (redirect) {
                process.stdout.write(colorStatus(redirect.statusCode) + ' ' + redirect.redirectUri + chalk.yellow(' --> '));
            });

            console.log(colorStatus(status), url);

            if (redirects.length) {
                _.uniq(relations.map(function (relation) {
                    return relation.from.urlOrDescription.replace(/#.*$/, '');
                })).forEach(function (url) {
                    console.log('\t' + chalk.cyan(url));
                });
            }
        }
    }

    function httpStatus(url, relations) {
        return function (callback) {
            request({
                url: url.replace(/#.*$/, ''),
                strictSSL: true,
                gzip: true
            }, function (error, res) {
                if (error) {
                    console.error('httpError', url, error);
                }

                var status = res.statusCode,
                    redirects = res.request.redirects;

                logHttpResult(status, url, redirects, relations);

                callback(error, redirects[0] && redirects[0].statusCode || status);
            });
        };
    }

    ag.logEvents()
        .loadAssets(options.inputUrls)
        .populate({
            followRelations: relationsQuery
        })
        .queue(function (assetGraph, callback) {
            var hrefMap = {};

            hrefMap = _.groupBy(assetGraph.findRelations({
                hrefType: ['absolute', 'protocolRelative']
            }, true), function (relation) {
                return relation.to.url.replace(/#.*$/, '');
            });

            var hrefs = Object.keys(hrefMap);

            console.error('Crawling ' + hrefs.length + ' outgoing urls:');
            async.parallelLimit(
                hrefs.map(function (url) {
                    return httpStatus(url, hrefMap[url]);
                }),
                20,
                function (err, results) {
                    console.log('Outgoing link status codes:');
                    console.log(_.countBy(results, function (r) { return r; }));

                    callback(err);
                }
            );
        })
        .writeStatsToStderr()
        .run(options.callback);
};


