'use strict';

let client = require('node-rest-client-promise').Client();

let token = null;

const defaultErrorHandler = (e) => {
    console.error("Request error: ");
    console.error(e);

    // TODO: re-login if required

    return Promise.reject(e);
};

const requestBuilder = (method, path) => {
    const BASE_PATH = 'http://tourism.opendatahub.bz.it/api';

    return async function (query, params, post) {
        let args = {
            path: query || {},
            parameters: params || {},
            data: post || {},
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (path !== '/LoginApi') {
            args['headers']['Authorization'] = `Bearer ${await getToken()}`;
        }

        if (method === 'GET') {
            return client.getPromise(BASE_PATH + path, args);
        } else if (method === 'POST') {
            return client.postPromise(BASE_PATH + path, args);
        }

    }
};

const loginRequest = requestBuilder('POST', '/LoginApi');

async function getToken() {
    if (token !== null) {
        return token;
    }

    let result = await loginRequest({}, {}, {username: "tourism@hackthealps.it", pswd: "$h4cKth34lpS"});
    token = result.data.access_token;
    console.log(token);

    return token;
};

module.exports = requestBuilder;