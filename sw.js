const CACHE_VERSION = "kmb-citybus-v1.0.16";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./app.js",
    "./style.css",
    "./manifest.json"
];

self.addEventListener("install", event => {

    console.log(
        "SW installing:",
        CACHE_VERSION
    );

    event.waitUntil(

        caches
            .open(CACHE_VERSION)
            .then(cache =>
                cache.addAll(
                    FILES_TO_CACHE
                )
            )

    );

    self.skipWaiting();
});

self.addEventListener("activate", event => {

    console.log(
        "SW activating:",
        CACHE_VERSION
    );

    event.waitUntil(

        caches
            .keys()
            .then(keys => {

                return Promise.all(

                    keys.map(key => {

                        if (
                            key !== CACHE_VERSION
                        ) {

                            console.log(
                                "Deleting old cache:",
                                key
                            );

                            return caches.delete(
                                key
                            );
                        }

                    })

                );

            })

    );

    return self.clients.claim();
});

self.addEventListener("fetch", event => {

    const url = new URL(
        event.request.url
    );

    // Never cache API calls
    if (
        url.hostname === "rt.data.gov.hk"
    ) {
        event.respondWith(
            fetch(event.request)
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
        .then(response =>
            response || fetch(event.request)
        )
    );
});