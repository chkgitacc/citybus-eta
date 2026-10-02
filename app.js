console.log(
    "CTB ETA starting..."
);

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

    const select =
        document.getElementById("routeSelect");

    select.innerHTML = "";

    let uniqueRoutes =
        [...new Set(routes.map(r => r.route))];

    uniqueRoutes.sort();

    uniqueRoutes.forEach(route => {

        let option =
            document.createElement("option");

        option.value = route;
        option.textContent = route;

        select.appendChild(option);
    });

    routeChanged();
}

async function routeChanged() {

    const route =
        document.getElementById(
            "routeSelect"
        ).value;

    const filtered =
        routes.filter(
            r => r.route === route
        );

    const dirSelect =
        document.getElementById(
            "directionSelect"
        );

    dirSelect.innerHTML = "";

    const inboundOption =
        document.createElement(
            "option"
        );

    inboundOption.value =
        "inbound";

    inboundOption.textContent =
        "Inbound";

    dirSelect.appendChild(
        inboundOption
    );

    const outboundOption =
        document.createElement(
            "option"
        );

    outboundOption.value =
        "outbound";

    outboundOption.textContent =
        "Outbound";

    dirSelect.appendChild(
        outboundOption
    );

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

        for (
            const stopRow of json.data
        ) {

            const stopRes =
                await fetch(
                    `${STOP_API}${stopRow.stop}`
                );

            if (!stopRes.ok) {
                continue;
            }

            const stopJson =
                await stopRes.json();

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                stopRow.stop;

            option.textContent =
                stopJson.data.name_en;

            stopSelect.appendChild(
                option
            );
        }

        console.log(
            "Dropdown loaded:",
            stopSelect.options.length
        );

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

    favorites.push({

        route,
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

    const res =
        await fetch(url);

    if(!res.ok){

        throw new Error(
            `ETA HTTP ${res.status}`
        );
    }

    const json =
        await res.json();

    return json.data.slice(0,3);
}


async function renderFavorites(){

    const container =
        document.getElementById(
            "favorites"
        );

    container.innerHTML = "";

    for(let i=0;i<favorites.length;i++){

        const bus =
            favorites[i];

        let etas = [];

        try {
            etas = await fetchETA(bus);
        }
        catch(ex) {
            console.error(ex);
        }

        const div =
            document.createElement("div");

        div.className = "card";

        let html =
            `<div class="route">${bus.route}</div>
             <div class="stop">${bus.stopName}</div>`;

        etas.forEach(e=>{

            html +=
            `<div class="eta">
             ${formatEta(e.eta)}
             </div>`;
        });

        html +=
        `<button
            class="deleteBtn"
            onclick="removeFavorite(${i})">
            Remove
         </button>`;

        div.innerHTML = html;

        container.appendChild(div);
    }
}

function formatEta(eta){
    if(!eta)
        return "--";

    const etaDate =
        new Date(eta);

    const mins =
        Math.max(
            0,
            Math.round(
                (etaDate - new Date())
                /60000
            )
        );
    return mins + " min";
}

function removeFavorite(index){
    favorites.splice(index,1);
    saveFavorites();
    renderFavorites();
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
    30000
);