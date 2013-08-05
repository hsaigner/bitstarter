#!/usr/bin/env node
/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/

var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var rest = require('restler');
var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";

var assertFileExists = function(infile) {
    var instr = infile.toString();
    if(!fs.existsSync(instr)) {
        console.log("File %s does not exist... Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var cheerioHtmlFile = function(htmlfile) {
    return cheerio.load(fs.readFileSync(htmlfile));
};

var buildfn = function(htmlfile) {
    var response2html = function(result) {
        if (result instanceof Error) {
            console.log("Error reading URL: %s... Exiting.", result.message);
            process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
        } else {
	    fd = fs.writeFileSync(htmlfile, result);
	    fs.chmodSync(htmlfile, '666');
        }
    };
    return response2html;
};

var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

var checkHtmlFile = function(htmlfile, checksfile) {
    $ = cheerioHtmlFile(htmlfile);
    var checks = loadChecks(checksfile).sort();
    var out = {};
    for(var ii in checks) {
        var present = $(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }
    return out;
};

var clone = function(fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

if(require.main == module) {
    program
        .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
        .option('-f, --file <html_file>', 'Path to index.html', clone(assertFileExists))
        .option('-u, --url <url>', 'Valid url')
        .parse(process.argv);
    var checkJson;
    if (program.url && program.file) {
	console.log("Only one of the options -f/--file or -u/--url is allowed.");
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    else {
	var htmlfile;
        if (program.url) {
	    htmlfile = "grader-" + process.pid + "-" + Date.now() + ".html";
    	    var response2html = buildfn(htmlfile);
	    rest.get(program.url).on('complete', response2html);
	    // Need to wait, since the downloaded file is not yet existing...
	    // Have a closer look later and also delete the downloaded file again
     	    setTimeout(function() {
		if (fs.existsSync(htmlfile)) {
		    checkJson = checkHtmlFile(htmlfile, program.checks);
		    var outJson = JSON.stringify(checkJson, null, 4);
		    console.log(outJson);
		}
	    }, 500);
        }
        else {
	    htmlfile = program.file || HTMLFILE_DEFAULT;
	    assertFileExists(htmlfile);
            checkJson = checkHtmlFile(htmlfile, program.checks);
            var outJson = JSON.stringify(checkJson, null, 4);
	    console.log(outJson);
	}
    }
} else {
    exports.checkHtmlFile = checkHtmlFile;
}
