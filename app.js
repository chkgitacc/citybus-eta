console.log(
    "CTB ETA starting..."
);

const stopCache = {};

const COMPANY = "CTB";

const ROUTE_API =
    "https://rt.data.gov.hk/v2/transport/citybus/route/CTB/";

const STOP_API =
    "https://rt.data.gov.hk/v2/transport/citybus/stop/";

const ROUTE_STOP_API =
    "https://rt.data.gov.hk/v2/transport/citybus/route-stop/CTB/";

const ETA_API =
    "https://rt.data.gov.hk/v2/transport/citybus/eta/CTB/";

let routes = [];
let favorites = JSON.parse(
    localStorage.getItem("favorites") || "[]"
);

async function loadRoutes(){

    console.log(
        "Loading routes..."
    );

    try {

        const res =
            await fetch(ROUTE_API);

        const json =
            await res.json();

        console.log(json);

        routes =
            json.data;

        console.log(
            `Loaded ${routes.length} routes`
        );

        populateRoutes();

    } catch(ex) {

        console.error(ex);

        alert(
            "Unable to load routes."
        );
    }
}

function populateRoutes(){
    filterRoutes();
}

function filterRoutes() {

    const keyword =
        document
        .getElementById("routeSearch")
        .value
        .trim()
        .toUpperCase();

    const select =
        document.getElementById(
            "routeSelect"
        );

    select.innerHTML = "";

    let uniqueRoutes =
        [...new Set(
            routes.map(r => r.route)
        )];

    uniqueRoutes
        .sort()
        .filter(route =>
            route.includes(keyword)
        )
        .forEach(route => {

            const option =
                document.createElement(
                    "option"
                );

            option.value = route;
            option.textContent = route;

            select.appendChild(option);
        });

    if (select.options.length > 0) {
        routeChanged();
    }
    else {
        document.getElementById(
            "directionSelect"
        ).innerHTML = "";

        document.getElementById(
            "stopSelect"
        ).innerHTML = "";
    }
}

async function routeChanged() {
    const route =
        document.getElementById("routeSelect").value;

    const dirSelect =
        document.getElementById("directionSelect");

    dirSelect.innerHTML = "";

    for (const dir of ["inbound", "outbound"]) {

        try {

            const res =
                await fetch(
                    `${ROUTE_STOP_API}${route}/${dir}`
                );

            const json =
                await res.json();

            if (!json.data?.length)
                continue;

            const firstStopId =
                json.data[0].stop;

            const lastStopId =
                json.data[
                    json.data.length - 1
                ].stop;

            const [firstRes, lastRes] =
                await Promise.all([
                    fetch(`${STOP_API}${firstStopId}`),
                    fetch(`${STOP_API}${lastStopId}`)
                ]);

            const firstStop =
                (await firstRes.json()).data;

            const lastStop =
                (await lastRes.json()).data;

            const option =
                document.createElement(
                    "option"
                );

            option.value = dir;

            option.textContent =
                `${dir === "inbound" ? "Inbound" : "Outbound"} - ` +
                `${firstStop.name_en} → ${lastStop.name_en}`;

            dirSelect.appendChild(option);

        } catch (ex) {
            console.error(ex);
        }
    }

    await directionChanged();
}

async function directionChanged(){

    const route =
        document.getElementById(
            "routeSelect"
        ).value;

    let dir =
        document.getElementById(
            "directionSelect"
        ).value;

    if(
        dir !== "inbound" &&
        dir !== "outbound"
    ){
        dir = "inbound";
    }

    const stopSelect =
        document.getElementById(
            "stopSelect"
        );

    stopSelect.innerHTML = "";

    try {

        const url =
            `${ROUTE_STOP_API}${route}/${dir}`;

        console.log(
            "Calling:",
            url
        );

        const res =
            await fetch(url);

        if (!res.ok) {

            throw new Error(
                `HTTP ${res.status}`
            );
        }

        const json =
            await res.json();

        console.log(json);

        console.log(
            "Stops returned:",
            json.data.length
        );

        const stopIds = json.data.map(
            stopRow => stopRow.stop
        );

        const stopDetails =
            await Promise.all(
                stopIds.map(
                    id => getStop(id)
                )
            );

        stopDetails.forEach((stop, index) => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                stopIds[index];

            option.textContent =
                stop.name_en;

            stopSelect.appendChild(
                option
            );

        });

        console.log(
            "Dropdown loaded:",
            stopSelect.options.length
        );

        //await findNearestStop();

    }
    catch(ex){

        console.error(ex);

        alert(
            "Unable to load stop list."
        );
    }
}

async function addFavorite(){

    const stopSelect =
        document.getElementById(
            "stopSelect"
        );

    if(stopSelect.options.length === 0){

        alert(
            "Please select a stop first."
        );

        return;
    }

    if(favorites.length >= 10){

        alert(
            "Maximum 10 buses."
        );

        return;
    }

    const route =
        document.getElementById(
            "routeSelect"
        ).value;

    const stopId =
        stopSelect.value;

    const stopName =
        stopSelect.options[
            stopSelect.selectedIndex
        ].text;

    const direction =
        document.getElementById(
            "directionSelect"
        ).value;

    const directionText =
        document.getElementById(
            "directionSelect"
        ).options[
            document.getElementById(
                "directionSelect"
            ).selectedIndex
        ].text;

    const exists =
        favorites.some(f =>
            f.route === route &&
            f.direction === direction &&
            f.stopId === stopId
        );

    if(exists){
        alert("Already added.");
        return;
    }

    favorites.push({
        route,
        direction,
        directionText,
        stopId,
        stopName
    });

    saveFavorites();

    await renderFavorites();

    document
        .getElementById("addPanel")
        .classList
        .add("hidden");
}

function saveFavorites(){

    localStorage.setItem(
        "favorites",
        JSON.stringify(favorites)
    );
}

async function fetchETA(bus){

    const url =
        `${ETA_API}${bus.stopId}/${bus.route}`;

    const res = await fetch(url);
    const json = await res.json();

    console.log(
        "ETA response",
        bus.route,
        bus.stopId,
        json.data
    );

    if (!bus.direction) {
        return json.data.slice(0,3);
    }

    const dirMap = {
        inbound: "I",
        outbound: "O",
        I: "I",
        O: "O"
    };

    return json.data
        .filter(
            eta => eta.dir === dirMap[bus.direction]
        )
        .slice(0,3);
    }

async function getStop(stopId){

    if(stopCache[stopId]){
        return stopCache[stopId];
    }

    const res =
        await fetch(
            `${STOP_API}${stopId}`
        );

    const json = await res.json();

    stopCache[stopId] =
        json.data;

    return json.data;
}

async function renderFavorites(){

    console.log(
        "renderFavorites called",
        favorites
    );

    const container =
        document.getElementById(
            "favorites"
        );

    container.innerHTML = "";

    const etaResults =
        await Promise.all(
            favorites.map(bus =>
                fetchETA(bus)
                    .catch(error => {
                        console.error(error);
                        return [];
                    })
            )
        );

    favorites.forEach((bus, i) => {

        const etas =
            etaResults[i];

        const div =
            document.createElement("div");

        div.className = "card";

        let html =
            `<div class="route">${bus.route}</div>
            <div class="direction">
                ${bus.directionText || "Direction N/A"}
            </div>
            <div class="stop">${bus.stopName}</div>`;

        const etaText =
            etas
            .map(e => formatEta(e.eta))
            .join(" | ");

        html += `
            <div class="eta">
                ${etaText || "--"}
            </div>
        `;

        html += `
            <button
                class="deleteBtn"
                onclick="removeFavorite(${i})">
                Remove
            </button>
        `;

        div.innerHTML = html;

        container.appendChild(div);

    });

}

function formatEta(eta){
    if(!eta)
        return "--";

    // const etaDate = new Date(eta);

    // const mins =
    //     Math.max(
    //         0,
    //         Math.floor(
    //             (etaDate - new Date())
    //             /60000
    //         )
    //     );
    // return mins + " min";

    const mins =
        (new Date(eta) - new Date())
        / 60000;

    if(mins < 1){
        return "Arriving";
    }

    return Math.floor(mins) + " min";
}

function removeFavorite(index){
    favorites.splice(index,1);
    saveFavorites();
    renderFavorites();
}

function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            position => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            reject,
            {
                enableHighAccuracy: true,
                timeout: 10000
            }
        );
    });
}

function getDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {
    const R = 6371e3;

    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;

    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(Δφ / 2) *
        Math.sin(Δφ / 2) +
        Math.cos(φ1) *
        Math.cos(φ2) *
        Math.sin(Δλ / 2) *
        Math.sin(Δλ / 2);

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
}

async function findNearestStop() {

    const stopSelect =
        document.getElementById(
            "stopSelect"
        );

    if (
        stopSelect.options.length === 0
    ) {
        alert(
            "Please select route and direction first."
        );
        return;
    }

    try {

        const current =
            await getCurrentLocation();

        const stopIds =
            [...stopSelect.options]
            .map(
                option => option.value
            );

        const stopDetails =
            await Promise.all(
                stopIds.map(
                    id => getStop(id)
                )
            );

        let nearestIndex = -1;
        let nearestDistance =
            Number.MAX_VALUE;

        stopDetails.forEach(
            (stop, index) => {

                const distance =
                    getDistance(
                        current.lat,
                        current.lng,
                        parseFloat(stop.lat),
                        parseFloat(stop.long)
                    );

                if (
                    distance <
                    nearestDistance
                ) {
                    nearestDistance =
                        distance;

                    nearestIndex =
                        index;
                }
            }
        );

        if (
            nearestIndex >= 0
        ) {

            stopSelect.selectedIndex =
                nearestIndex;

            const stopName =
                stopSelect.options[
                    nearestIndex
                ].text;

            alert(
                `Nearest stop selected:\n${stopName}\n(${Math.round(nearestDistance)}m away)`
            );
        }

    } catch (error) {

        console.error(error);

        alert(
            "Unable to get current location."
        );
    }
}

document
.getElementById("showAddBtn")
.addEventListener("click",()=>{
    document
    .getElementById("addPanel")
    .classList
    .toggle("hidden");
});

document
.getElementById("routeSelect")
.addEventListener(
    "change",
    routeChanged
);

document
.getElementById("directionSelect")
.addEventListener(
    "change",
    directionChanged
);

document
.getElementById("saveBtn")
.addEventListener(
    "click",
    addFavorite
);

document
.getElementById("closeBtn")
.addEventListener(
    "click",
    () => {
        document
        .getElementById("addPanel")
        .classList
        .add("hidden");
    }
);

document
.getElementById("routeSearch")
.addEventListener(
    "input",
    filterRoutes
);

document
.getElementById("nearbyBtn")
.addEventListener(
    "click",
    findNearestStop
);

if (
    "serviceWorker" in navigator &&
    location.protocol !== "file:"
) {

    window.addEventListener(
        "load",
        async () => {

            try {

                const registration =
                    await navigator
                        .serviceWorker
                        .register("sw.js");

                console.log(
                    "Service Worker registered:",
                    registration.scope
                );

                registration.update();

            } catch(error) {

                console.error(
                    "Service Worker registration failed",
                    error
                );

            }

        }
    );

} else {

    console.log(
        "Service Worker disabled " +
        "(file:// mode)"
    );

}

loadRoutes();
renderFavorites();

setInterval(
    renderFavorites,
    15000
);