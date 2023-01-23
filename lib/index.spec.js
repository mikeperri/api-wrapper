'use strict';
const Promise = require('bluebird');
const rewire = require('rewire');

const ApiWrapper = rewire('./');

describe('the rest-wrapper module', function () {
  const mockRequest = jasmine.createSpy('mockRequest');

  beforeEach(function () {
    ApiWrapper.__set__('request', mockRequest);
  });

  it('should be an object', function () {
    expect(ApiWrapper).toEqual(jasmine.any(Object));
  });

  describe('the create function', function () {
    beforeEach(function () {
      mockRequest.calls.reset();
    });

    it('should exist', function () {
      expect(ApiWrapper.create).toEqual(jasmine.any(Function));
    });

    it('should replace path variables', function () {
      const client = ApiWrapper.create({
        root: 'https://michaeljperri.com/api/',
        get: {
          search: '/search/${mode}/${customerId}/',
        },
      });
      const callback = function () {};

      client.search({ mode: 'cool', customerId: 1337, frivolousParam: 'abc' }, callback);

      expect(mockRequest).toHaveBeenCalledWith(
        {
          method: 'GET',
          uri: 'https://michaeljperri.com/api/search/cool/1337/',
        },
        callback
      );
    });

    it('should append query parameters', function () {
      const client = ApiWrapper.create({
        root: 'https://michaeljperri.com/api/',
        get: {
          search: '/search?zc|rd',
        },
      });
      const callback = function () {};

      client.search({ zc: 11746, rd: 30, frivolousParam: 'abc' }, callback);

      expect(mockRequest).toHaveBeenCalledWith(
        {
          method: 'GET',
          uri: 'https://michaeljperri.com/api/search?zc=11746&rd=30',
        },
        callback
      );
    });

    it('should pass options to the request module', function () {
      const client = ApiWrapper.create({
        root: 'https://michaeljperri.com/api/',
        get: {
          search: {
            pathPattern: '/search',
            requestOptions: {
              some: 'option',
            },
          },
        },
      });
      const callback = function () {};

      client.search({}, callback);

      expect(mockRequest).toHaveBeenCalledWith(
        {
          uri: 'https://michaeljperri.com/api/search',
          method: 'GET',
          some: 'option',
        },
        callback
      );
    });

    it('should pass options to the request module when in a GET function call', function () {
      const client = ApiWrapper.create({
        root: 'https://michaeljperri.com/api/',
        get: {
          search: {
            pathPattern: '/search',
            requestOptions: {
              some: 'option',
            },
          },
        },
      });
      const callback = function () {};

      client.search({}, { someOther: 'option' }, callback);

      expect(mockRequest).toHaveBeenCalledWith(
        {
          uri: 'https://michaeljperri.com/api/search',
          method: 'GET',
          some: 'option',
          someOther: 'option',
        },
        callback
      );
    });

    it('should pass options to the request module when in a POST function call', function () {
      const client = ApiWrapper.create({
        root: 'https://michaeljperri.com/api/',
        post: {
          search: {
            pathPattern: '/search',
            requestOptions: {
              some: 'option',
            },
          },
        },
      });
      const callback = function () {};

      client.search({}, 'some-request-body', { someOther: 'option' }, callback);

      expect(mockRequest).toHaveBeenCalledWith(
        {
          uri: 'https://michaeljperri.com/api/search',
          method: 'POST',
          body: 'some-request-body',
          some: 'option',
          someOther: 'option',
        },
        callback
      );
    });

    it('should return functions that accept a body paramter for PATCH, PUT, and POST methods', function () {
      const client = ApiWrapper.create({
        root: 'https://michaeljperri.com/api/',
        patch: {
          patch: '/patch',
        },
        put: {
          upload: '/upload',
        },
        post: {
          postUp: '/post-up',
        },
      });
      const cb = function () {};

      client.patch({}, 'partial change', cb);
      client.upload({}, '"; DROP TABLE * FROM users', cb);
      client.postUp({}, 'posting up', cb);

      expect(mockRequest.calls.allArgs()).toEqual([
        [
          {
            uri: 'https://michaeljperri.com/api/patch',
            method: 'PATCH',
            body: 'partial change',
          },
          cb,
        ],
        [
          {
            uri: 'https://michaeljperri.com/api/upload',
            method: 'PUT',
            body: '"; DROP TABLE * FROM users',
          },
          cb,
        ],
        [
          {
            uri: 'https://michaeljperri.com/api/post-up',
            method: 'POST',
            body: 'posting up',
          },
          cb,
        ],
      ]);
    });

    it('should set defaults for the request module', function () {
      const mockRequestWithDefaults = jasmine.createSpy('mockRequestWithDefaults');

      mockRequest.defaults = jasmine.createSpy('mockRequest.defaults');
      mockRequest.defaults.and.callFake(function (defaults) {
        return mockRequestWithDefaults;
      });

      const client = ApiWrapper.create({
        root: 'https://michaeljperri.com/api/',
        get: {
          search: '/search?zc|rd',
        },
        requestDefaults: {
          some: 'option',
        },
      });

      expect(mockRequest.defaults).toHaveBeenCalledWith({ some: 'option' });

      const callback = function () {};
      client.search({ zc: 11746, rd: 30, frivolousParam: 'abc' }, callback);

      expect(mockRequestWithDefaults).toHaveBeenCalledWith(
        {
          method: 'GET',
          uri: 'https://michaeljperri.com/api/search?zc=11746&rd=30',
        },
        callback
      );
    });
  });

  describe('the parseJson option', function () {
    it('should parse JSON', function () {
      mockRequest.and.callFake(function (uri, cb) {
        cb(null, { status: 200 }, '{ "test": true }');
      });
      const client = ApiWrapper.create({
        root: 'https://michaeljperri.com/api/',
        parseJson: true,
        get: {
          search: {
            pathPattern: '/search',
            requestOptions: {
              some: 'option',
            },
          },
        },
      });
      const callback = jasmine.createSpy('callback');

      client.search({}, callback);

      expect(callback).toHaveBeenCalledWith(null, { status: 200 }, { test: true });
    });

    it('should handle parse errors', function () {
      mockRequest.and.callFake(function (uri, cb) {
        cb(null, { status: 200 }, 'cant parse this');
      });
      const client = ApiWrapper.create({
        root: 'https://michaeljperri.com/api/',
        parseJson: true,
        get: {
          search: {
            pathPattern: '/search',
            requestOptions: {
              some: 'option',
            },
          },
        },
      });
      const callback = jasmine.createSpy('callback');

      client.search({}, callback);

      expect(callback).toHaveBeenCalledWith('Could not parse JSON');
    });
  });

  describe('when the wrapper returned by the create function is promisified by Bluebird', function () {
    beforeEach(function () {
      mockRequest.and.callFake(function (uri, cb) {
        cb(null, { status: 200 }, '{ "test": true }');
      });
      mockRequest.calls.reset();
    });

    it('should work with standard GET call', function (done) {
      let client = ApiWrapper.create({
        root: 'https://michaeljperri.com/api/',
        get: {
          search: '/search/${pathVar}?param',
        },
      });

      client = Promise.promisifyAll(client);
      client
        .searchAsync({ pathVar: 'a', param: 'b' })
        .spread(function (message, body) {
          expect(message).toEqual({ status: 200 });
          expect(body).toEqual('{ "test": true }');
          expect(mockRequest.get).toHaveBeenCalledWith('https://michaeljperri.com/api/search/a?param=b', jasmine.any(Function));
        })
        .finally(done);
    });

    it('should work with a request that takes a body parameter', function (done) {
      let client = ApiWrapper.create({
        root: 'https://michaeljperri.com/api/',
        put: {
          upload: '/upload/${pathVar}?param',
        },
      });
      client = Promise.promisifyAll(client);

      client
        .uploadAsync({ pathVar: 'a', param: 'b' }, '"; DROP TABLE * FROM users')
        .spread(function (message, body) {
          expect(message).toEqual({ status: 200 });
          expect(body).toEqual('{ "test": true }');
          expect(mockRequest).toHaveBeenCalledWith(
            {
              uri: 'https://michaeljperri.com/api/upload/a?param=b',
              method: 'PUT',
              body: '"; DROP TABLE * FROM users',
            },
            jasmine.any(Function)
          );
        })
        .finally(done);
    });

    it('should work when parseJson is enabled', function (done) {
      let client = ApiWrapper.create({
        root: 'https://michaeljperri.com/api/',
        parseJson: true,
        get: {
          search: '/search/${pathVar}?param',
        },
      });
      client = Promise.promisifyAll(client);

      client
        .searchAsync({ pathVar: 'a', param: 'b' })
        .spread(function (message, body) {
          expect(message).toEqual({ status: 200 });
          expect(body).toEqual({ test: true });
          expect(mockRequest.get).toHaveBeenCalledWith('https://michaeljperri.com/api/search/a?param=b', jasmine.any(Function));
        })
        .finally(done);
    });
  });
});
