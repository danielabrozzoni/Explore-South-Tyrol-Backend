'use strict';

const TileSet = require('node-hgt').TileSet;
const tileset = new TileSet('/home/user/.cache/srtm/');

const CONSTANT = 1000;

const getElevation = (lat, lon) => {
    return new Promise((resolve, reject) => {
        tileset.getElevation([lat, lon], function (err, elevation) {
            if (err) {
                reject(err);
            } else {
                resolve(elevation);
            }
        });
    });
};

async function isPathObstructed(aPos, bPos) {
    let a = {
        lat: Math.round(aPos[0] * CONSTANT),
        lon: Math.round(aPos[1] * CONSTANT),
        elev: await getElevation(aPos[0], aPos[1])
    };

    let b = {
        lat: Math.round(bPos[0] * CONSTANT),
        lon: Math.round(bPos[1] * CONSTANT),
        elev: await getElevation(bPos[0], bPos[1])
    };

    let steps = Math.max(Math.abs(a.lat - b.lat), Math.abs(a.lon - b.lon));

    let latDiff = Math.abs(a.lat - b.lat);
    let lonDiff = Math.abs(a.lon - b.lon);
    let elevStep = (b.elev - a.elev) / steps;

    let latStep = b.lat > a.lat ? 1 : -1;
    let lonStep = b.lon > a.lon ? 1 : -1;

    latStep *= latDiff / Math.max(latDiff, lonDiff);
    lonStep *= lonDiff / Math.max(latDiff, lonDiff);

    // ----------------------

    while (Math.abs(a.lat - b.lat) > 1 || Math.abs(a.lon - b.lon) > 1) {
        const realElev = await getElevation(a.lat / CONSTANT, a.lon / CONSTANT);

        if (realElev > a.elev + 100) {
            return false;
        }

        a.lat += latStep;
        a.lon += lonStep;
        a.elev += elevStep;
    }

    return true;
};

module.exports = {
    isPathObstructed,
    getElevation
};