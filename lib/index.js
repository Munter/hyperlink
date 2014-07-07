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

function logHttpResult(status, url, redirects) {
    redirects.forEach(function (redirect) {
        process.stdout.write(colorStatus(redirect.statusCode) + ' ' + redirect.redirectUri + chalk.yellow(' --> '));
    });

    console.log(colorStatus(status), url);
}

function httpStatus(href) {
    return function (callback) {
        request({
            url: href,
            strictSSL: true,
            gzip: true
        }, function (error, res) {
            if (error) {
                console.error('httpError', href, error);
            }

            var status = res.statusCode;

            logHttpResult(status, href, res.request.redirects);
            callback(error);
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

            var outgoingRelations = assetGraph.findRelations({
                type: 'HtmlAnchor',
                hrefType: ['absolute', 'protocolRelative']
            }, true);

            var hrefs = _.uniq(outgoingRelations.map(function (relation) {
                return relation.to.url;
            }));

            console.error('Crawling ' + hrefs.length + ' outgoing links:');
            async.parallelLimit(hrefs.map(function (href) {
                    return httpStatus(href);
                }),
                20,
                callback
            );
        })
        .writeStatsToStderr()
        .run(options.callback);
};


