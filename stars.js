'use strict';

const redis = require('redis');
const uuidv4 = require('uuid/v4');

const client = redis.createClient();

async function getKeys(lat, lon, radius = 25) {
    return new Promise((resolve, reject) => {
        client.send_command('GEORADIUS', ['Stars', lon, lat, radius, 'm', 'WITHCOORD', 'ASC'], (err, response) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(response);
        })
    });
}

async function getCountStar(key) {
    return new Promise((resolve, reject) => {
        client.send_command('GET', [key], (err, response) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(response);
        })
    });
}

async function getStarredPlaces(lat, lon, radius = 25, threshold = 20) {
    let records = await getKeys(lat, lon, radius);
    let promises = [];

    async function mapPlace(place) {
        return {
            key: place[0],
            lon: place[1][0],
            lat: place[1][1],
            count: await getCountStar(place[0])
        }

    }

    records.forEach(place => promises.push(mapPlace(place)));

    records = await Promise.all(promises);

    records.sort(function compare(a, b) {
        return a.count - b.count;
    });

    return records.filter(r => r.count > threshold);
}

async function addGeoPoint(lat, lon, key) {
    return new Promise((resolve, reject) => {
        client.send_command('GEOADD', ['Stars', lon, lat, key], (err, response) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(response);
        });
    });
}

async function save(lat, lon) {
    console.log(lat, lon);
    let records = await getKeys(lat, lon);

    let key = null;

    if (records.length === 0) {
        key = uuidv4(); // random key
        await addGeoPoint(lat, lon, key);
    } else {
        key = records[0][0];
    }

    return new Promise((resolve, reject) => {
        client.send_command('INCR', [key], (err, response) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(response);
        })
    });
}

module.exports = {
    save,
    get: getStarredPlaces
};