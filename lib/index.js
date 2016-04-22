'use strict';
var request = require('request');

var pathVarsRe = /\${([^\}]+)}/g;

function getPathVars(path) {
    var pathVars = [];
    var match;

    while ((match = pathVarsRe.exec(path)) !== null) {
        pathVars.push(match[1]);
    }

    return pathVars;
}

function parse(pathPattern) {
    var splitByQuestionMark = pathPattern.split('?');

    return {
        withoutParams: splitByQuestionMark[0],
        params: splitByQuestionMark.length > 1 ? splitByQuestionMark[1].split('|') : [],
        pathVars: getPathVars(pathPattern),
    };
}

function uriJoin(a, b) {
    if (!a.endsWith('/')) {
        a = a + '/';
    }

    if (b.startsWith('/')) {
        b = b.substr(1);
    }

    return a + b;
}

function buildUri(root, args, parseResult) {
    var uri = uriJoin(root, parseResult.withoutParams);
    var params = [];

    Object.keys(args).forEach(function (key) {
        var value = args[key];
        var pathVarIndex = parseResult.pathVars.indexOf(key);
        var paramsIndex;

        if (pathVarIndex !== -1) {
            uri = uri.replace('${' + key + '}', value);
        } else if ((paramsIndex = parseResult.params.indexOf(key)) !== -1) {
            params.push(key + '=' + value);
        }
    });

    if (params.length) {
        uri = uri + '?' + params.join('&');
    }

    return uri;
}

function buildWrapperFn(root, parseResult, method, requestModule, requestOptions, shouldParseJson) {
    requestOptions = requestOptions || {};

    if ([ 'patch', 'post', 'put' ].indexOf(method) !== -1) {
        return function () {
    	    var args = arguments['0'];
    	    var body = arguments['1'];
    	    var moreRequestOptions = arguments.length === 4 ? arguments['2'] : {};
    	    var cb = arguments.length === 4 ? arguments['3'] : arguments['2'];

            var uri = buildUri(root, args, parseResult);
            var next = shouldParseJson ? getParseJsonFn(cb) : cb;

            Object.assign(requestOptions, moreRequestOptions);
            requestOptions.uri = uri;
            requestOptions.method = method.toUpperCase();
            requestOptions.body = body;

            return requestModule(requestOptions, next);
        }
    } else {
        return function () {
    	    var args = arguments['0'];
    	    var moreRequestOptions = arguments.length === 3 ? arguments['1'] : {};
    	    var cb = arguments.length === 3 ? arguments['2'] : arguments['1'];

    	    var uri = buildUri(root, args, parseResult);
            var next = shouldParseJson ? getParseJsonFn(cb) : cb;

            Object.assign(requestOptions, moreRequestOptions);
            requestOptions.uri = uri;
            requestOptions.method = method.toUpperCase();

            return requestModule(requestOptions, next);
        }
    }
}

function getParseJsonFn(cb) {
    return function (error, message, body) {
        var parsedBody;

        if (error) {
            cb(error);
        } else {
            try {
                parsedBody = JSON.parse(body);
            } catch (e) {
                cb('Could not parse JSON');
            }

            cb(null, message, parsedBody);
        }
    };
}

function getMethodIterator(config, cb) {
    var httpMethods = [ 'delete', 'get', 'head', 'patch', 'post', 'put' ];

    httpMethods.forEach(function (method) {
        var methodMap = config[method];

        if (methodMap) {
            Object.keys(methodMap).forEach(function (key) {
                var value = methodMap[key];

                cb(method, key, value);
            });
        }
    });
}

module.exports.create = function (config) {
    var root = config.root;
    var shouldParseJson = config.parseJson;
    var requestDefaults = config.requestDefaults;
    var requestModule = requestDefaults ? request.defaults(requestDefaults) : request;
    var wrapper = {};

    getMethodIterator(config, function (method, key, value) {
        var pathPattern;
        var requestOptions;
        var parseResult;

        if (typeof value === 'string') {
            pathPattern = value;
            requestOptions = null;
        } else {
            pathPattern = value.pathPattern;
            requestOptions = value.requestOptions;
        }

        parseResult = parse(pathPattern);
        wrapper[key] = buildWrapperFn(root, parseResult, method, requestModule, requestOptions, shouldParseJson);
    });

    return wrapper;
}
