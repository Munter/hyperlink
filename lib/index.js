var _ = require('lodash');
var AssetGraph = require('assetgraph');
var async = require('async');
var request = require('request');
var chalk = require('chalk');

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
    if (status !== 200 || redirects.length) {
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


module.exports = function (options) {
    options = options || {};

    options.callback = options.callback || function () { console.warn('Done'); };
    var ag = new AssetGraph({
        root: options.root
    });

    ag.on('addRelation', function (rel) {
        //console.log(rel.toString());
    });

    ag.logEvents()
        .loadAssets(options.initialAssets)
        .populate({
            followRelations: {
                hrefType: ['relative', 'rootRelative']
            }
        })
        .queue(function (assetGraph, callback) {
            var hrefMap = {};

            hrefMap = _.groupBy(assetGraph.findRelations({
                type: 'HtmlAnchor',
                hrefType: ['absolute', 'protocolRelative']
            }, true), function (relation) {
                return relation.to.url.replace(/#.*$/, '');
            });

            var hrefs = Object.keys(hrefMap);

            console.error('Crawling ' + hrefs.length + ' outgoing links:');
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


