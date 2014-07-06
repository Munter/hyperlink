var AssetGraph = require('assetgraph');
var request = require('request');


module.exports = function (options) {
    options = options || {};

    options.callback = options.callback || function () { console.warn('Done'); };
    var ag = new AssetGraph({
        root: options.root
    });

    ag.on('addRelation', function (rel) {
        console.log(rel.toString());
    });


    ag.logEvents()
        .loadAssets(options.initialAssets)
        .populate({
            followRelations: {
                type: ['relative', 'rootRelative']
            }
        })
        .run(options.callback);
};


