var expect = require('unexpected');
var relationDebugDescription = require('../lib/relationDebugDescription');

describe('relationDebugDescription', function () {
    it('should throw when not passed an AssetGraph.Relation instance', function () {
        expect(relationDebugDescription, 'to throw', /relation argument must be an AssetGraph.Relation instance/);

        expect(function () { relationDebugDescription(1); }, 'to throw', /relation argument must be an AssetGraph.Relation instance/);
        expect(function () { relationDebugDescription('foo'); }, 'to throw', /relation argument must be an AssetGraph.Relation instance/);
        expect(function () { relationDebugDescription([]); }, 'to throw', /relation argument must be an AssetGraph.Relation instance/);
        expect(function () { relationDebugDescription({}); }, 'to throw', /relation argument must be an AssetGraph.Relation instance/);
    })
});
