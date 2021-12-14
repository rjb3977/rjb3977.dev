import ArcMap from "https://js.arcgis.com/4.22/@arcgis/core/Map.js";
import WebMap from "https://js.arcgis.com/4.22/@arcgis/core/WebMap.js";
import MapView from "https://js.arcgis.com/4.22/@arcgis/core/views/MapView.js";
import FeatureLayer from "https://js.arcgis.com/4.22/@arcgis/core/layers/FeatureLayer.js";
import PopupTemplate from "https://js.arcgis.com/4.22/@arcgis/core/PopupTemplate.js"
import IdentityManager from "https://js.arcgis.com/4.22/@arcgis/core/identity/IdentityManager.js"
import OAuthInfo from "https://js.arcgis.com/4.22/@arcgis/core/identity/OAuthInfo.js"

(async () => {
    // RIT's portal URL; we need permission to access maps from here
    const portalUrl = "http://ritarcgis.maps.arcgis.com";

    // tell the library what app this is
    IdentityManager.registerOAuthInfos([
        new OAuthInfo({
            appId: "wKnUOBiPaLjXGUG6",
            popup: false,
            popupCallbackUrl: "https://rjb3977.dev/car-accidents/",
            expiration: 20160,
            portalUrl,
        }),
    ]);

    // if the user isn't logged in yet, redirect them to the login page
    await IdentityManager.getCredential(portalUrl);

    const map = new ArcMap({
        basemap: "arcgis-streets-night"
    });

    const view = new MapView({
        map: map,
        center: [ -77.67437, 43.08466 ], // RIT Sentinel
        constraints: {
            minZoom: 4,
            maxZoom: 16,
        },
        zoom: 4,
        container: "main",
        // spatialReference: {
        //     wkid: 102008,
        // }
    });

    // a lot of this layer nonsense does nothing, but was supposed to help make
    // the time extent stuff work. that did not end up working, but this still works
    // as it is, so I don't feel the need to remove it.
    const getLayer = (name, index) => new FeatureLayer({
        url: `https://services2.arcgis.com/RQcpPaCpMAXzUI5g/arcgis/rest/services/${name}/FeatureServer/${index}`,
        visible: false,
    });

    const layers = [
        ["CarAccident3",  0],
        ["CarAccident3",  1],
        ["CarAccident3",  2],
        ["CarAccident3",  3],
        ["CarAccident3",  4],
        ["CarAccident3",  5],
        ["CarAccident3",  6],
        ["CarAccident3",  7],
    ].map(([name, index]) => getLayer(name, index));

    map.addMany(layers);

    // The order is all messed up because when I manually made them I messed some
    // up and had to delete them and remake them. Apparently it saves them in order
    // of creation, and they can't be reordered.
    let activeList = null;
    const pointLayer = layers[0];
    const layerMap = {
        all: [
            0, 1, 2, 7, 3, 4, 5, 6,
        ],
        year: [
            0, 1, 2, 7, 3, 4, 5, 6,
        ],
        month: [
            0, 1, 2, 7, 3, 4, 5, 6,
        ],
    };

    for (let key in layerMap) {
        layerMap[key] = layerMap[key].map(i => layers[i]);
    }

    // set the popup template for every layer
    layers.forEach(layer => {
        layer.popupTemplate = new PopupTemplate({
            title: "{expression/count} Car Accidents",
            content: `
                Severity 1: {SUM_Severity_1} <br>
                Severity 2: {SUM_Severity_2} <br>
                Severity 3: {SUM_Severity_3} <br>
                Severity 4: {SUM_Severity_4} <br>
            `,
            expressionInfos: [{ // for some reason {COUNT} does not work, so instead just add up the severities
                name: "count",
                title: "count",
                expression: "$feature.SUM_Severity_1 + $feature.SUM_Severity_2 + $feature.SUM_Severity_3 + $feature.SUM_Severity_4"
            }],
            overwriteActions: true,
            actions: [],
        });
    });

    // change the popup template for the point layer, since it's special
    pointLayer.popupTemplate = new PopupTemplate({
        title: "Accident at {Time}",
        content: "",
        overwriteActions: true,
        actions: [],
    });

    // helper functions for dealing with radio buttons
    const getInputs = name => [...document.querySelectorAll(`input[name="${name}"]`)];
    const getSelection = name => getInputs(name).find(e => e.checked).value;

    // get the appropriate index in the current list of layers for the current zoom level
    const getZoomIndex = () => [
        [11, 0],
        [10, 1],
        [ 9, 2],
        [ 8, 3],
        [ 7, 4],
        [ 6, 5],
        [ 5, 6],
        [ 4, 7],
    ].find(([z, _]) => view.zoom >= z)[1];

    // change which layer is visible according to current zoom
    const updateZoom = () => {
        const i = getZoomIndex();
        layers.forEach(layer => {
            layer.visible = layer === activeList[i];
        });
    };

    // update time based on radio buttons (does nothing, since time doesn't work)
    const updateTime = () => {
        let year = getSelection("radio-year");

        getInputs("radio-month").forEach(i => {
            i.disabled = year === "all";
        })

        if (year === "all") {
            activeList = layerMap.all;
            view.timeExtent = null;
        } else {
            year = parseInt(year);
            let month = getSelection("radio-month");

            if (month === "all") {
                activeList = layerMap.year;
                view.timeExtent = {
                    start: new Date(Date.UTC(year,     0, 1)),
                    end:   new Date(Date.UTC(year + 1, 0, 1) - 1),
                }
            } else {
                month = parseInt(month);
                activeList = layerMap.month;
                view.timeExtent = {
                    start: new Date(Date.UTC(year, month - 1, 1)),
                    end:   new Date(Date.UTC(year, month ,    1) - 1),
                };
            }
        }

        // console.log(view.timeExtent.start.toISOString());

        updateZoom();
    };

    // update once to get things started
    updateTime();

    // watch for updates to the radio buttons (does nothing, since time doesn't work)
    document.querySelectorAll('input[name="radio-year"], input[name="radio-month"]').forEach(i => {
        i.addEventListener("change", updateTime);
    });

    // watch for changes to the view's zoom
    view.watch("zoom", updateZoom);
})();
