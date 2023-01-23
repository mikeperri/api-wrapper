'use strict';
const request = require('request');

const pathVarsRe = /\${([^}]+)}/g;

function getPathVars(path) {
  const pathVars = [];
  let match;

  while ((match = pathVarsRe.exec(path)) !== null) {
    pathVars.push(match[1]);
  }

  return pathVars;
}

function parse(pathPattern) {
  const splitByQuestionMark = pathPattern.split('?');

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
    b = b.substring(1)
  }

  return a + b;
}

function buildUri(root, args, parseResult) {
  let uri = uriJoin(root, parseResult.withoutParams);
  const params = [];

  Object.keys(args).forEach(function (key) {
    const value = args[key];
    const pathVarIndex = parseResult.pathVars.indexOf(key);

    if (pathVarIndex !== -1) {
      uri = uri.replace('${' + key + '}', value);
    } else if ((parseResult.params.indexOf(key)) !== -1) {
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

  if (['patch', 'post', 'put'].indexOf(method) !== -1) {
    return function () {
      const args = arguments['0'];
      const body = arguments['1'];
      const moreRequestOptions = arguments.length === 4 ? arguments['2'] : {};
      const cb = arguments.length === 4 ? arguments['3'] : arguments['2'];

      const uri = buildUri(root, args, parseResult);
      const next = shouldParseJson ? getParseJsonFn(cb) : cb;

      Object.assign(requestOptions, moreRequestOptions);
      requestOptions.uri = uri;
      requestOptions.method = method.toUpperCase();
      requestOptions.body = body;

      return requestModule(requestOptions, next);
    };
  } else {
    return function () {
      const args = arguments['0'];
      const moreRequestOptions = arguments.length === 3 ? arguments['1'] : {};
      const cb = arguments.length === 3 ? arguments['2'] : arguments['1'];

      const uri = buildUri(root, args, parseResult);
      const next = shouldParseJson ? getParseJsonFn(cb) : cb;

      Object.assign(requestOptions, moreRequestOptions);
      requestOptions.uri = uri;
      requestOptions.method = method.toUpperCase();

      return requestModule(requestOptions, next);
    };
  }
}

function getParseJsonFn(cb) {
  return function (error, message, body) {
    let parsedBody;

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
  const httpMethods = ['delete', 'get', 'head', 'patch', 'post', 'put'];

  httpMethods.forEach(function (method) {
    const methodMap = config[method];

    if (methodMap) {
      Object.keys(methodMap).forEach(function (key) {
        const value = methodMap[key];

        cb(method, key, value);
      });
    }
  });
}

module.exports.create = function (config) {
  const root = config.root;
  const shouldParseJson = config.parseJson;
  const requestDefaults = config.requestDefaults;
  const requestModule = requestDefaults ? request.defaults(requestDefaults) : request;
  const wrapper = {};

  getMethodIterator(config, function (method, key, value) {
    let pathPattern;
    let requestOptions;
    let parseResult;

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
};
