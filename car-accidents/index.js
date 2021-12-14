// import config from "https://js.arcgis.com/4.22/@arcgis/config.js"
import ArcMap from "https://js.arcgis.com/4.22/@arcgis/core/Map.js";
import WebMap from "https://js.arcgis.com/4.22/@arcgis/core/WebMap.js";
import MapView from "https://js.arcgis.com/4.22/@arcgis/core/views/MapView.js";
import FeatureLayer from "https://js.arcgis.com/4.22/@arcgis/core/layers/FeatureLayer.js";
import VectorTileLayer from "https://js.arcgis.com/4.22/@arcgis/core/layers/VectorTileLayer.js";
import PopupTemplate from "https://js.arcgis.com/4.22/@arcgis/core/PopupTemplate.js"
import IdentityManager from "https://js.arcgis.com/4.22/@arcgis/core/identity/IdentityManager.js"
import OAuthInfo from "https://js.arcgis.com/4.22/@arcgis/core/identity/OAuthInfo.js"


(async () => {
    const portalUrl = "http://ritarcgis.maps.arcgis.com";

    IdentityManager.registerOAuthInfos([
        new OAuthInfo({
            appId: "wKnUOBiPaLjXGUG6",
            popup: false,
            popupCallbackUrl: "http://rjb3977.dev/car-accidents/",
            expiration: 20160,
            portalUrl,
        }),
    ]);

    await IdentityManager.getCredential(portalUrl);

    window.ArcMap = ArcMap;
    window.WebMap = WebMap;
    window.MapView = MapView;
    window.IdentityManager = IdentityManager;

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

    // const layers = [0, 1, 2, 3, 4, 5, 6].map(i => new VectorTileLayer({
    //     url: `https://vectortileservices2.arcgis.com/RQcpPaCpMAXzUI5g/arcgis/rest/services/rjb3977_car_accidents_vector_tile/VectorTileServer/${i}`,
    //     visible: false,
    // }));

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

    layers.forEach(layer => {
        layer.popupTemplate = new PopupTemplate({
            title: "{expression/count} Car Accidents",
            content: `
                Severity 1: {SUM_Severity_1} <br>
                Severity 2: {SUM_Severity_2} <br>
                Severity 3: {SUM_Severity_3} <br>
                Severity 4: {SUM_Severity_4} <br>
            `,
            expressionInfos: [{
                name: "count",
                title: "count",
                expression: "$feature.SUM_Severity_1 + $feature.SUM_Severity_2 + $feature.SUM_Severity_3 + $feature.SUM_Severity_4"
            }],
            overwriteActions: true,
            actions: [],
        });
    });

    pointLayer.popupTemplate = new PopupTemplate({
        title: "Accident at {Time}",
        content: "",
        overwriteActions: true,
        actions: [],
    });

    const getInputs = name => [...document.querySelectorAll(`input[name="${name}"]`)];
    const getSelection = name => getInputs(name).find(e => e.checked).value;

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

    const updateZoom = () => {
        const i = getZoomIndex();
        layers.forEach(layer => {
            layer.visible = layer === activeList[i];
        });
    };

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

    updateTime();

    document.querySelectorAll('input[name="radio-year"], input[name="radio-month"]').forEach(i => {
        i.addEventListener("change", updateTime);
    });

    view.watch("zoom", updateZoom);

    // view.popup.autoOpenEnabled = false;
    // view.on('click', async event => {
    //     const hit = await view.hitTest(event, {
    //         include: layers.filter(l => l.visible),
    //     });

    //     if (hit.results.length > 0) {
    //         const graphics = hit.results.map(result => result.graphic);

    //         console.log("hit graphics", graphics);

    //         view.popup.open({
    //             location: event.mapPoint,
    //             features: graphics,
    //         });

    //         window.graphics = graphics;
    //     }
    // });

    window.view = view;
    window.layers = layers;
})();
