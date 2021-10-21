# Hyperlink

[![NPM version](https://badge.fury.io/js/hyperlink.svg)](http://badge.fury.io/js/hyperlink)
[![Build Status](https://travis-ci.org/Munter/hyperlink.svg?branch=master)](https://travis-ci.org/Munter/hyperlink)
[![Coverage Status](https://coveralls.io/repos/github/Munter/hyperlink/badge.svg?branch=master)](https://coveralls.io/github/Munter/hyperlink?branch=master)
[![Dependency Status](https://david-dm.org/Munter/hyperlink.svg)](https://david-dm.org/Munter/hyperlink) [![Greenkeeper badge](https://badges.greenkeeper.io/Munter/hyperlink.svg)](https://greenkeeper.io/)

Detect invalid and inefficient links on your webpages. Works with local files or websites, on the command line and as a node library.

Because web performance is not only about making your own page run smoothly, but also about giving people a quick navigation out of your page.

Read some more of the thoughts behind hyperlink in [Check your link rot](https://mntr.dk/2015/check-your-link-rot/).

Hyperlink is known to:

- Detect broken links to internal assets
- Detect broken links to external assets
- Detect broken links to fragment identifiers
- Detect missing DNS records on external links
- Detect inefficient external links that result in a redirect chain
- Detect miscellaneous syntax errors in your web assets
- Detect mixed content warnings on TLS secured pages

Todo:

- Detect inefficient redirects to internal assets
- Autocorrect inefficient redirects in local files

## Installation

```
$ npm install -g hyperlink
```

Hyperlink exposes an executable `hyperlink` in your npm binaries folder.

## Usage

Command line usage and options:

```
hyperlink [options] <htmlFile(s) | url(s)>

Options:
  -h, --help         Show this help                     [default: false]
  --root             Path to your web root (will be deduced from your
                     input files if not specified)
  --canonicalroot    URI root where the project being built will be
                     deployed. Canonical URLs in local sources will be
                     resolved to local URLs
  --verbose, -v      Log all added assets and relations. VERY verbose.
  --recursive, -r    Crawl all HTML-pages linked with relative and root
                     relative links. This stays inside your domain.
  --internal, -i     Only check links to assets within your own web root

  --pretty, -p       Resolve "pretty" urls without .html extension to
                     the .html file on disk             [default: false]
  --source-maps      Verify the correctness of links to source map
                     files and sources.                 [default: false]
  --skip             Avoid running a test where the report matches the
                     given pattern
  --todo             Mark a failed tests as todo where the report
                     matches the given pattern
  --concurrency, -c  The maximum number of assets that can be loading
                     at once                               [default: 25]
```

Hyperlink takes any number of input files or urls. It is recommended having these urls on the same domain or be part of the same web site.

The `--root` option is only needed for resolving root relative urls in case you are not sending in pages located in the web root.

## Common Use Cases

### Checking internal URL's only

Running `hyperlink path/to/index.html --canonicalroot https://deployed.website.com/ -r --internal path/to/index.html` will recursively explore the internals links of your website to ensure internal integrity. It is recommended to make this a part of your build pipeline and block on errors, since any error is very likely to be actually user facing if our page is deployed.

Running `hyperlink path/to/index.html --canonicalroot https://deployed.website.com/ -r path/to/index.html` will recursively explore **all** links of your website, internal and external, to ensure that you aren't linking to external resources that have been removed or are otherwise failing. It is not recommended to block your build pipeline on a failure of external links, since they are out of your control. Run in this mode in a non-blocking way and fix the errors in the report at your leisure. It is recommended to to this regularly, since external assets can move or disappear without warning.

### Using a sitemap

Hyperlink understands sitemaps, and if you have one, it is recommended to start hyperlink out from that. You might have multiple sitemaps, annotated with `Sitemap:`-directives in your `robots.txt`, in which case you can start hyperlink from your `robots.txt` as well. Run `hyperlink path/to/robots.txt` or `hyperlink path/to/sitemap.xml`

The following sitemap formats are supported:

- [XML Sitemap](https://en.wikipedia.org/wiki/Sitemaps#File_format)
- [Text Sitemap](https://en.wikipedia.org/wiki/Sitemaps#Text_file)
- [RSS or Atom syndictation feeds](https://en.wikipedia.org/wiki/Sitemaps#Syndication_feed)

## Reporters

Hyperlink is using the [TAP](https://testanything.org/) output format, which is sort of human readable, and very machine readable. Use the TAP output in your CI setup, or pipe the output through one of these awesome reporters to get improved human readability or an output Jenkins likes

These reporters are known to work well with hyperlink:

- [tap-spot](https://www.npmjs.com/package/tap-spot): Minimal output for non-errors and human readable reports for errors marked as TODO or ERROR

**Example:**

```
$ hyperlink https://mntr.dk/ | tap-spot
```

![](https://i.imgur.com/tvan2YY.png)

[Tee](http://en.wikipedia.org/wiki/Tee_%28command%29) is a very useful program when you want to save and replay TAP outputs. In order to save the output to a file but still see the logs on stdout you might run a command line like so:

```
hyperlink https://mntr.dk -r | tee mntr.dk.tap | tap-spot
```

## License

The MIT License (MIT)

Copyright (c) 2014 Peter Müller <munter@fumle.dk>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
