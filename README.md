Hyperlink
=========
[![NPM version](https://badge.fury.io/js/hyperlink.svg)](http://badge.fury.io/js/hyperlink)
[![Dependency Status](https://david-dm.org/Munter/hyperlink.svg)](https://david-dm.org/Munter/hyperlink)

Detect invalid and inefficient links on your webpages. Works with local files or websites, on the command line and as a node library.

Because web performance is not only about making your own page run smoothly, but also about giving people a quick navigation out of your page.

Read some more of the thoughts behind hyperlink in [Check your link rot](https://mntr.dk/2015/check-your-link-rot/).

Hyperlink is known to:
- Detect broken links to internal assets
- Detect broken links to external assets
- Detect missing DNS records on external links
- Detect inefficient external links that result in a redirect chain
- Detect miscellaneous syntax errors in your web assets
- Detect mixed content warnings on TLS secured pages

Todo:
- Detect inefficient redirects to internal assets
- Autocorrect inefficient redirects in local files


Installation
------------

```
$ npm install -g hyperlink
```

Hyperlink exposes an executable `hyperlink` in your npm binaries folder.


Usage
-----

Command line usage and options:

`hyperlink <url | urls | file | files> [--root path/to/webroot] [--recursive | -r]`

Hyperlink takes any number of input files or urls. It is recommended having these urls on the same domain or be part of the same web site.

The `--root` option is only needed for resolving root relative urls in case you are not sending in pages located in the web root.

The most common use case is to do `hyperlink path/to/index.html -r`, giving `hyperlink` your index file in your web root and having it recursively explore all linked pages and their referenced assets, internal and external.


Integrations
------------

Hyperlink is using the [TAP](https://testanything.org/) output format, which is sort of human readable, and very machine readable. Use the TAP output in your CI setup, or pipe the output through one of these awesome formatters to get improved human readability, an output Jenkins likes, or whatever you want: [tap-colorize](https://www.npmjs.com/package/tap-colorize) [tap-difflet](https://www.npmjs.com/package/tap-difflet) [tap-dot](https://www.npmjs.com/package/tap-dot) [tap-json](https://www.npmjs.com/package/tap-json) [tap-min](https://www.npmjs.com/package/tap-min) [tap-nyan](https://www.npmjs.com/package/tap-nyan) [tap-spec](https://www.npmjs.com/package/tap-spec) [tap-xunit](https://www.npmjs.com/package/tap-xunit)

**Example:**

```
$ hyperlink https://mntr.dk/ | tap-nyan
 37  -_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-__,------,
 1   -_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-__|  /\_/\
 0   -_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_~|_( x .x)
     -_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_ ""  ""
  Failed Tests: There was 1 failure

    ✗ Crawling 17 outgoing urls: URI should have no redirects - http://www.milwaukeepolicenews.com/

```

[Tee](http://en.wikipedia.org/wiki/Tee_%28command%29) is a very useful program when you want to save and replay TAP outputs. In order to save the output to a file but still see the logs on stdout you might run a command line like so:

```
hyperlink https://mntr.dk -r | tee mntr.dk.tap | tap-colorize
```


License
-------

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
