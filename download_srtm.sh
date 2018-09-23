#!/bin/bash

mkdir -pv srtm/

files=( "N46E010.hgt" "N46E011.hgt" "N46E012.hgt" "N47E010.hgt" "N47E011.hgt" "N47E012.hgt" )

for f in "${files[@]}"
do
    if [ ! -f srtm/$f ]; then
        wget https://dds.cr.usgs.gov/srtm/version2_1/SRTM3/Eurasia/${f}.zip -O srtm/temp.zip;
        unzip srtm/temp.zip -d srtm/;
        rm srtm/temp.zip
    fi
done