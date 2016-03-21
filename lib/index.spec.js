'use strict';
var Promise = require('bluebird');
var rewire = require('rewire');

var ApiWrapper = rewire('./');

describe('the rest-wrapper module', function () {
    var mockRequest = jasmine.createSpy('mockRequest');

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
            var client = ApiWrapper.create({
                root: 'https://michaeljperri.com/api/',
                get: {
                    search: '/search/${mode}/${customerId}/'
                }
            });
            var callback = function () {};

            client.search({ mode: 'cool', customerId: 1337, frivolousParam: 'abc' }, callback);

            expect(mockRequest).toHaveBeenCalledWith({
                method: 'GET',
                uri: 'https://michaeljperri.com/api/search/cool/1337/'
            }, callback);
        });

        it('should append query parameters', function () {
            var client = ApiWrapper.create({
                root: 'https://michaeljperri.com/api/',
                get: {
                    search: '/search?zc|rd'
                }
            });
            var callback = function () {};

            client.search({ zc: 11746, rd: 30, frivolousParam: 'abc' }, callback);

            expect(mockRequest).toHaveBeenCalledWith({
                method: 'GET',
                uri: 'https://michaeljperri.com/api/search?zc=11746&rd=30'
            }, callback);
        });

        it('should pass options to the request module', function () {
            var client = ApiWrapper.create({
                root: 'https://michaeljperri.com/api/',
                get: {
                    search: {
                        pathPattern: '/search',
                        requestOptions: {
                            some: 'option'
                        }
                    }
                }
            });
            var callback = function () {};

            client.search({}, callback);

            expect(mockRequest).toHaveBeenCalledWith({
                uri: 'https://michaeljperri.com/api/search',
                method: 'GET',
                some: 'option',
            }, callback);
        });

        it('should return functions that accept a body paramter for PATCH, PUT, and POST methods', function () {
            var client = ApiWrapper.create({
                root: 'https://michaeljperri.com/api/',
                patch: {
                    patch: '/patch'
                },
                put: {
                    upload: '/upload'
                },
                post: {
                    postUp: '/post-up'
                }
            });
            var cb = function () {};

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
                    cb
                ],
                [
                    {
                        uri: 'https://michaeljperri.com/api/upload',
                        method: 'PUT',
                        body: '"; DROP TABLE * FROM users'
                    },
                    cb
                ],
                [
                    {
                        uri: 'https://michaeljperri.com/api/post-up',
                        method: 'POST',
                        body: 'posting up'
                    },
                    cb
                ]
            ]);
        });

        it('should set defaults for the request module', function () {
            var mockRequestWithDefaults = jasmine.createSpy('mockRequestWithDefaults');

            mockRequest.defaults = jasmine.createSpy('mockRequest.defaults');
            mockRequest.defaults.and.callFake(function (defaults) {
                return mockRequestWithDefaults;
            });

            var client = ApiWrapper.create({
                root: 'https://michaeljperri.com/api/',
                get: {
                    search: '/search?zc|rd'
                },
                requestDefaults: {
                    some: 'option'
                }
            });

            expect(mockRequest.defaults).toHaveBeenCalledWith({ some: 'option' });

            var callback = function () {};
            client.search({ zc: 11746, rd: 30, frivolousParam: 'abc' }, callback);

            expect(mockRequestWithDefaults).toHaveBeenCalledWith({
                method: 'GET',
                uri: 'https://michaeljperri.com/api/search?zc=11746&rd=30'
            }, callback);
        });
    });

    describe('when the wrapper returned by the create function is promisified by Bluebird', function () {
        beforeEach(function () {
            mockRequest.and.callFake(function (uri, cb) {
                cb(null, { test: true });
            });
            mockRequest.calls.reset();
        });

        it('should work with standard GET call', function (done) {
            var client = ApiWrapper.create({
                root: 'https://michaeljperri.com/api/',
                get: {
                    search: '/search/${pathVar}?param'
                }
            });
            client = Promise.promisifyAll(client);

            client.searchAsync({ pathVar: 'a', param: 'b' })
                .then(function (response) {
                    expect(response).toEqual({ test: true });
                    expect(mockRequest.get).toHaveBeenCalledWith('https://michaeljperri.com/api/search/a?param=b', jasmine.any(Function));
                })
                .finally(done);
        });

        it('should work with a request that takes a body parameter', function (done) {
            var client = ApiWrapper.create({
                root: 'https://michaeljperri.com/api/',
                put: {
                    upload: '/upload/${pathVar}?param'
                }
            });
            client = Promise.promisifyAll(client);

            client.uploadAsync({ pathVar: 'a', param: 'b' }, '"; DROP TABLE * FROM users')
                .then(function (response) {
                    expect(response).toEqual({ test: true });
                    expect(mockRequest).toHaveBeenCalledWith({
                        uri: 'https://michaeljperri.com/api/upload/a?param=b',
                        method: 'PUT',
                        body: '"; DROP TABLE * FROM users'
                    }, jasmine.any(Function));
                })
                .finally(done);
        });
    });
});
