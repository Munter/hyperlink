var expect = require('unexpected');
var AssetGraph = require('assetgraph');
var relationDebugDescription = require('../lib/relationDebugDescription');

function getRelation(assetConfig) {
  assetConfig = assetConfig || {
    type: 'Html',
    url: `file://${__dirname}/index.html`,
    text:
      '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>Document</title>\n</head>\n<body>\n    <a href="foo.html">foo</a>\n</body>\n</html>',
  };

  var assetGraph = new AssetGraph({ root: __dirname });
  var defaultAsset = new AssetGraph[assetConfig.type](assetConfig, assetGraph);

  assetGraph.addAsset(defaultAsset);

  return defaultAsset.outgoingRelations[0];
}

describe('relationDebugDescription', function () {
  it('should throw when not passed an AssetGraph.Relation instance', function () {
    expect(
      relationDebugDescription,
      'to throw',
      /relation argument must be an AssetGraph.Relation instance/
    );

    expect(
      function () {
        relationDebugDescription(1);
      },
      'to throw',
      /relation argument must be an AssetGraph.Relation instance/
    );
    expect(
      function () {
        relationDebugDescription('foo');
      },
      'to throw',
      /relation argument must be an AssetGraph.Relation instance/
    );
    expect(
      function () {
        relationDebugDescription([]);
      },
      'to throw',
      /relation argument must be an AssetGraph.Relation instance/
    );
    expect(
      function () {
        relationDebugDescription({});
      },
      'to throw',
      /relation argument must be an AssetGraph.Relation instance/
    );
  });

  it('should return asset.urlOrDescription when asset is not text', function () {
    var relation = getRelation();
    relation.from.isText = false;
    var result = relationDebugDescription(relation);

    expect(result, 'to end with', 'index.html');
  });

  it('should append line and char offsets to file-url assets', function () {
    var relation = getRelation();
    var result = relationDebugDescription(relation);

    expect(result, 'to end with', 'index.html:8:14 <a href="foo.html">...</a>');
  });

  it('should append line and char offsets to non-file-url assets', function () {
    return new AssetGraph({ root: 'https://mntr.dk' })
      .loadAssets({
        type: 'Html',
        url: 'https://mntr.dk/index.html',
        text:
          '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>Document</title>\n</head>\n<body>\n    <a href="foo.html">foo</a>\n</body>\n</html>',
      })
      .populate({ followRelations: { crossOrigin: false } })
      .queue(function (assetGraph) {
        var relation = assetGraph.findRelations({}, true)[0];
        var result = relationDebugDescription(relation);
        expect(
          result,
          'to end with',
          'index.html (8:14) <a href="foo.html">...</a>'
        );
      });
  });

  it('should handle relations to inline assets', function () {
    return new AssetGraph({ root: __dirname })
      .loadAssets({
        type: 'Html',
        url: `file://${__dirname}/index.html`,
        text:
          '<!doctype html><html><head><style>body { background: url(https://mntr.dk/invalid.png); }</style></head><body></body></html>',
      })
      .populate({ followRelations: { crossOrigin: false } })
      .queue(function (assetGraph) {
        var relation = assetGraph.findRelations({}, true)[1];
        var result = relationDebugDescription(relation);
        expect(
          result,
          'to end with',
          'index.html:1:58 (inlined Css) url(https://mntr.dk/invalid.png)'
        );
      });
  });

  it('should escape newlines in output', async function () {
    const ag = new AssetGraph();

    await ag.loadAssets({
      type: 'Html',
      url: 'https://webpack.js.org',
      text: `<a href="http://try.idonethis.com/developer
?utm_campaign=opencollective&amp;utm_medium=github&amp;utm_source=angular-fullstack">newline link</a>`,
    });

    const result = relationDebugDescription(ag.findRelations({}, true)[0]);

    expect(
      result,
      'to be',
      'https://webpack.js.org (2:102) <a href="http://try.idonethis.com/developer\\n?utm_campaign=opencollective&amp;utm_medium=github&amp;utm_source=angular-fullstack">...</a>'
    );
  });
});
