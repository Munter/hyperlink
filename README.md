Hyperlink
=========
[![NPM version](https://badge.fury.io/js/hyperlink.svg)](http://badge.fury.io/js/hyperlink)
[![Dependency Status](https://david-dm.org/Munter/hyperlink.svg)](https://david-dm.org/Munter/hyperlink)

Detect invalid and inefficient links on your webpages. Works with local files or websites, on the command line and as a node library.

Because web performance is not only about making your own page run smoothly, but also about giving people a quick navigation out of your page.

Hyperlink is known to:
- Detect broken links to internal assets
- Detect broken links to external assets
- Detect missing DNS records on external links
- Detect inefficient external links that reult in a redirect chain
- Detect miscellaneous syntax errors in your web assets

Todo:
- Detect inefficient redirects to internal assets
- Autocorrect inefficient redirects in local files

Feedback Needed
---------------

This was a quick hack to scratch an itch, so it's not very polished. Yet.

Please open issues with features you would like to see and ideas on how to improve the output so it becomes more human redable.


Installation
------------

```
$ npm install -g hyperlink
```

Hyperlink exposes an executable `hyperlink` in your npm binaries folder.


Usage
-----

```
$ hyperlink http://mntr.dk
 ✔ 0.002 secs: logEvents
 ✔ 1.873 secs: loadAssets
 ✔ 2.035 secs: populate
Crawling 15 outgoing urls:
Outgoing link status codes:
{ '200': 15 }
 ✔ 2.997 secs:
  Html  1 11.8 KB
   Ico  1  1.1 KB
   Png  8 13.1 KB
   Css  2 28.3 KB
   Rss  1  4.6 KB
   Svg  1  8.6 KB
  Jpeg  1  2.6 KB
Total: 15 70.2 KB
 ✔ 0.003 secs: writeStatsToStderr
Done
```

Command line usage and options:

`hyperlink <url | urls | file | files> [--root path/to/webroot] [--recursive | -r] [--verbose | -v]`

Hyperlink takes any number of input files or urls. It is recommended having these urls on the same domain or be part of the same web site.

The `--root` option is only needed for resolving root relaive urls in case you are not sending in pages located in the web root.

The most common use case is to do `hyperlink path/to/index.html -r`, giving `hyperlink` your index file in your web root and having it recursively explore all linked pages and their referenced assets, internal and external.


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
