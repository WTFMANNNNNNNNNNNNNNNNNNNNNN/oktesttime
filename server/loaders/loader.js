// Now lets load the files
const requires = [
    "./global.js", // Now lets get the global virables before loading the next files.
    // Debug / other
    "../miscFiles/collisionFunctions.js", // The actual collision functions that make the game work.
    "../miscFiles/color.js", // Color manager that manages the entities's color.
    "../Game/debug/lagLogger.js", // Lag Logger.
    "../Game/debug/logs.js", // Logs.
    "../Game/entities/subFunctions.js", // This helps keeping the entities work.
    // Controllers
    "../miscFiles/controllers.js", // The AI of the game.
    // Entities
    "../Game/entities/vector.js", // Define a vector. Required By Entity.js.
    "../Game/entities/skills.js", // Define skills. Required By Entity.js.
    "../Game/entities/gun.js", // Define gun to make guns to work. Required By Entity.js.
    "../Game/entities/healthType.js", // Define health to make healths work when a entity got hit, or regenerated. Required By Entity.js.
    "../Game/entities/antiNaN.js", // This file prevents NaN to entities.
    "../Game/entities/propEntity.js", // This file create prop entities, Its actually a turret entity but its decorative only. Required By Entity.js.
    "../Game/entities/bulletEntity.js", // The Entity constructor but with heavy limitations.
    "../Game/entities/entity.js", // The actual Entity constructor.
    // Definitions
    "../lib/definitions/combined.js", // Get definitions.
    // Room setup
    "./roomLoader.js", // Now lets load the rework room setup. (by AE)
    "../miscFiles/tileEntity.js", // What this does, It creates tiles for the room setup.
    // Mockups
    "../miscFiles/mockups.js", // This file loads the mockups.
];

for (let file of requires) {
    const module = require(file);
    for (let key in module) if (module.hasOwnProperty(key)) global[key] = module[key];
}

module.exports = {
    creationDate: new Date(),
    creationTime: new Date().getTime()
};
