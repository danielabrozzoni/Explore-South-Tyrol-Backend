'use strict';

const express = require('express');

const obstruction = require('./obstruction');
const request_builder = require('./request-builder');
const bodyParser = require('body-parser');

const stars = require('./stars');

const PORT = process.env.PORT || 3000;

const app = express();

// parse application/json
app.use(bodyParser.json());

const getPois = request_builder('GET', '/Poi');

const NEAR_PRECISION = 1;

Math.radians = function (degrees) {
    return degrees * Math.PI / 180;
};

Math.degrees = function (radians) {
    return radians * 180 / Math.PI;
};

async function getRelativePos(a, b, heading) {
    let angle = Math.atan2(b.lat - a.lat, b.lon - a.lon);
    angle += Math.radians(heading);

    angle %= (2 * Math.PI);  // Now in the range [0,2pi]

    if (angle > Math.PI) {
        angle -= 2 * Math.PI;  // If angle is between pi and 2pi, subtract 2pi to make negative.
    }

    let aElev = await obstruction.getElevation(a.lat, a.lon);
    let bElev = await obstruction.getElevation(b.lat, b.lon);

    let x = Math.cos(angle) * 25;
    let z = Math.sin(angle) * 25;

    let y = bElev / aElev * 5 - 2;
    let dist = Math.sqrt((a.lat - b.lat) * (a.lat - b.lat) + (a.lon - b.lon) * (a.lon - b.lon));

    if (dist < 0.001) {
        x = 0.5;
        z = -0.5;
        y = -1;

        dist = 2.5;
    }

    return {x, z, y, dist};
}

app.get('/poi', function (req, res) {
    if (!req.query.latitude || !req.query.longitude) {
        res.status(400).send({});
        return;
    }

    getPois({
        poitype: 4,
        radius: 20000,
        pagesize: 200,
        latitude: req.query.latitude,
        longitude: req.query.longitude
    })
    /*.then(d => {
        const ansPromises = [];
        d.data.Items.forEach(item => {
            ansPromises.push(obstruction.isPathObstructed([req.query.latitude, req.query.longitude], [item.GpsPoints.position.Latitude, item.GpsPoints.position.Longitude]))
        });

        return Promise.all([d.data.Items, Promise.all(ansPromises)])
    })
    .then(result => {
        return result[0];
    })*/
        .then(d => d.data.Items)
        .then(async function (d) {
            // Fetch the starred places

            let starred = await stars.get(req.query.latitude, req.query.longitude, 10000, 20);
            starred.forEach(place => {
                console.log(place);
                d.push({
                    GpsInfo: [{
                        Latitude: place.lat,
                        Longitude: place.lon
                    }],
                    Detail: {
                        en: {
                            Title: place.count,
                            BaseText: ''
                        }
                    },
                    type: 'STARRED'
                })
            });

            return d;
        })
        .then(result => {
            async function mapItem(place) {
                let {x, y, z, dist} = await getRelativePos({
                    lat: req.query.latitude,
                    lon: req.query.longitude
                }, {
                    lat: place.GpsInfo[0].Latitude,
                    lon: place.GpsInfo[0].Longitude,
                }, req.query.heading);

                return {
                    title: place.Detail.en.Title,
                    text: place.Detail.en.BaseText,
                    x, y, z, dist,
                    type: place.type === 'STARRED' ? place.type : 'POINT'
                }
            }

            const promises = [];
            result.forEach(place => promises.push(mapItem(place)));
            return Promise.all(promises);
        })
        .then(result => {
            const map = {};

            function isFar(place) {
                let key = place.x.toFixed(NEAR_PRECISION) + ':' + place.y.toFixed(NEAR_PRECISION);

                if (map[key] === true) {
                    return false;
                }

                return map[key] = true;
            }

            return result.filter(isFar);
        })
        .then(result => {
            res.send(result);
        });
});

app.post('/star', function (req, res) {
    if (!req.body.latitude || !req.body.longitude) {
        res.status(400).send({});
        return;
    }

    stars.save(req.body.latitude, req.body.longitude);
    res.send({});
});

app.listen(PORT, function () {
    console.log(`Server listening on port ${PORT}!`);
});