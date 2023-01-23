# api-wrapper

Creates a Node wrapper around a REST API with minimal config.

The returned wrapper uses the [request](https://github.com/request/request/tree/v2.69.0) module to make HTTP calls.

## Usage

Just pass a config object to the **create** method.

Specify the root URL for the wrapped API with the root option.
Create functions on the wrapper by passing a map of function names to path patterns for each HTTP METHOD.

```
ApiWrapper = require('api-wrapper');

mjpClient = ApiWrapper.create({
    root: 'https://michaeljperri.com/api/',
    parseJson: true,
    get: {
        search: '/search/${zipCode}?radius|make'
        getCustomerById: '/search/${customerId}'
    },
    post: {
        postMessage: '/message/${messageId}'
    },
    requestDefaults: {
        headers: { 'auth-token': 1337 }
    }
});
```

Now you can call the wrapped API like this:

```
mjpClient.search({ zipCode: 11746, radius: 30, make: 'Ford' }, callback);
// makes a GET request to https://michaeljperri.com/api/search/11746?radius=30&make=Ford

mjpClient.postMessage({ messageId: 1234 }, 'some-post-data', callback);
// makes a POST request to https://michaeljperri.com/api/submit/1234 with the body 'some-post-data'

function callback(error, message, body) {
    if (!error) {
        console.log('Got response:', body);
    } else {
        console.warn('Got error:', e);
    }
}
```

### get, delete, head

These maps will create functions on the returned wrapper that take two parameters: path arguments and a callback. When those functions are called, they'll make requests with the corresponding HTTP method.

### post, patch, put

These will create functions that take three parameters: path arguments, a request body, and a callback.

### path patterns

Path patterns will be interpolated with the path arguments. These can correspond to either path variables (like `${pathVariable}`) or query params (separated by pipes like `?param1|param2|param3`).

### parseJson

If true, the wrapper will attempt to parse the response body as JSON before passing it to the callback.

### requestDefaults

The requestDefaults parameter will be passed to [request.defaults](https://github.com/request/request/tree/v2.69.0#requestdefaultsoptions).

### Overriding request options

You may need to set more options for the request module, for example, HTTP headers.

You can set options for all calls to an endpoint when creating the wrapper:

```
ApiWrapper = require('api-wrapper');

mjpClient = ApiWrapper.create({
    root: 'https://michaeljperri.com/api/',
    post: {
        postMessage: '/message/${messageId}',
        submit: {
            pathPattern: '/submit/${formId}',
            requestOptions: {
                headers: [
                    {
                        name: 'content-type',
                        value: 'application/x-www-form-urlencoded'
                    }
                ]
            }
        }
    }
});
```

Now calling mjpClient.submit({}, 'request-body', callback) will make a request with the given headers.

You can also add more options to the request object when you call the function by adding another parameter before the callback, e.g.:

```
mjpClient.submit({}, 'request-body', { headers: { 'cookies': 'someCookie=blah;' } }, callback)

```

For a request that doesn't take a body parameter, that would be:

```
mjpClient.search({}, { headers: { 'cookies': 'someCookie=blah;' } }, callback)
```

See the [request documentation](https://github.com/request/request/tree/v2.69.0#requestoptions-callback) for the full list of options.

## Promisify

If you prefer to use promises rather than callbacks, the returned wrapper can be 'promisified' with Bluebird.

```
var Promise = require('bluebird');

mjpClient = Promise.promisifyAll(mjpClient);

mjpClient.searchAsync({ formId: 1234 }, 'some-form-data')
    .then(function (message, body) {
        console.log('Got response:', body);
    })
    .catch(function (e) {
        console.warn('Got error:', e);
    });
```

See the [bluebird documentation](http://bluebirdjs.com/docs/api/promise.promisifyall.html) for more details.

## More examples

See [lib/index.spec.js](https://github.com/mikeperri/api-wrapper/blob/master/lib/index.spec.js).
