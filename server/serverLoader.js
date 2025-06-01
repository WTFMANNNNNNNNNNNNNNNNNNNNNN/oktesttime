const { workerData, parentPort } = require("worker_threads");

// Load required game components
require("./loaders/serverFileLoader.js");
// Create the game server
new (require("./game.js").gameServer)(
    workerData.host,
    workerData.port,
    workerData.gamemode,
    workerData.region,
    workerData.properties,
    parentPort
);
