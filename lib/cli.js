#!/usr/bin/env node

const yargs = require('yargs');
const commandLineOptions = yargs
  .usage(
    'Check your hyperlinks integrities.\n$0 [options] <htmlFile(s) | url(s)>'
  )
  .options('h', {
    alias: 'help',
    describe: 'Show this help',
    type: 'boolean',
    default: false,
  })
  .options('root', {
    describe:
      'Path to your web root (will be deduced from your input files if not specified)',
    type: 'string',
    demand: false,
  })
  .options('canonicalroot', {
    describe:
      'URI root where the project being built will be deployed. Canonical URLs in local sources will be resolved to local URLs',
    type: 'string',
    demand: false,
  })
  .options('verbose', {
    alias: 'v',
    describe: 'Log all added assets and relations. VERY verbose.',
    type: 'boolean',
  })
  .options('recursive', {
    alias: 'r',
    describe:
      'Crawl all HTML-pages linked with relative and root relative links. This stays inside your domain.',
    type: 'boolean',
  })
  .options('internal', {
    alias: 'i',
    describe: 'Only check links to assets within your own web root',
    type: 'boolean',
  })
  .options('pretty', {
    alias: 'p',
    describe:
      'Resolve "pretty" urls without .html extension to the .html file on disk',
    type: 'boolean',
    default: false,
  })
  .options('source-maps', {
    describe:
      'Verify the correctness of links to source map files and sources.',
    type: 'boolean',
    default: false,
  })
  .options('skip', {
    describe:
      'Avoid running a test where the report matches the given pattern (case-sensitive substring match)',
    type: 'string',
    demand: false,
  })
  .options('todo', {
    describe:
      'Mark a failed test as todo where the report matches the given pattern (case-sensitive substring match)',
    type: 'string',
    demand: false,
  })
  .options('exclude', {
    describe:
      'Url pattern to exclude from the build. **THIS OPTION IS DEPRECATED**',
    type: 'string',
    demand: false,
  })
  .options('concurrency', {
    alias: 'c',
    describe: 'The maximum number of assets that can be loading at once',
    default: 25,
    type: 'integer',
  })
  .options('debug', {
    describe: 'Print debugging information during the run',
    type: 'boolean',
  })
  .wrap(72).argv;

if (commandLineOptions.h) {
  yargs.showHelp();
  process.exit(1);
}

const urlTools = require('urltools');
const canonicalRoot =
  commandLineOptions.canonicalroot &&
  urlTools.ensureTrailingSlash(commandLineOptions.canonicalroot);
const skipPatterns =
  (commandLineOptions.skip && [].concat(commandLineOptions.skip)) || [];
const todoPatterns =
  (commandLineOptions.todo && [].concat(commandLineOptions.todo)) || [];
const followSourceMaps = commandLineOptions['source-maps'];
let rootUrl =
  commandLineOptions.root &&
  urlTools.urlOrFsPathToUrl(commandLineOptions.root, true);
let inputUrls;

if (commandLineOptions.exclude) {
  console.error('The --exclude option has been deprecated in hyperlink 4.x');
  process.exit(1);
}

if (commandLineOptions._.length > 0) {
  inputUrls = commandLineOptions._.map(function (urlOrFsPath) {
    return urlTools.urlOrFsPathToUrl(String(urlOrFsPath), false);
  });
  if (!rootUrl) {
    rootUrl = urlTools.findCommonUrlPrefix(inputUrls);
    if (rootUrl) {
      console.error('Guessing --root from input files: ' + rootUrl);
    }
  }
} else if (rootUrl && /^file:/.test(rootUrl)) {
  inputUrls = [rootUrl + '**/*.html'];
  console.error('No input files specified, defaulting to ' + inputUrls[0]);
} else {
  console.error(
    "No input files and no --root specified (or it isn't file:), cannot proceed.\n"
  );
  yargs.showHelp();
  process.exit(1);
}

const TapRender = require('@munter/tap-render');
const hyperlink = require('./index');

const skipFilter = (report) =>
  Object.values(report).some((value) =>
    skipPatterns.some((pattern) => String(value).includes(pattern))
  );
const todoFilter = (report) =>
  Object.values(report).some((value) =>
    todoPatterns.some((pattern) => String(value).includes(pattern))
  );

const t = new TapRender();
t.pipe(process.stdout);

(async () => {
  try {
    await hyperlink(
      {
        root: rootUrl,
        canonicalRoot: canonicalRoot,
        inputUrls: inputUrls,
        followSourceMaps: followSourceMaps,
        recursive: commandLineOptions.recursive,
        internalOnly: commandLineOptions.internal,
        pretty: commandLineOptions.pretty,
        skipFilter,
        todoFilter,
        verbose: commandLineOptions.verbose,
        concurrency: commandLineOptions.concurrency,
        memdebug: commandLineOptions.debug,
      },
      t
    );
  } catch (err) {
    console.log(err.stack);
    process.exit(1);
  }
  const results = t.close();

  process.exit(results.fail ? 1 : 0);
})();
