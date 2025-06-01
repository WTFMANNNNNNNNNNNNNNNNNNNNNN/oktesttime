// Now we need to define every tile.
let fs = require('fs'),
	path = require('path'),
	groups = fs.readdirSync(path.resolve(__dirname, '../Game/room_setup/tiles/'));
    if (c.LOGS) console.log(`Importing tile definitions...`);
for (let filename of groups) {
    if (c.LOGS) console.log(`Loading tile file: ${filename}`);
    require('../Game/room_setup/tiles/' + filename);
}
console.log("Successfully imported tile definitions.\n");