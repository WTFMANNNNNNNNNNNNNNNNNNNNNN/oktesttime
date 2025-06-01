// Now we need to define every tile.
let fs = require('fs'),
	path = require('path'),
	groups = fs.readdirSync(path.resolve(__dirname, '../Game/room_setup/tiles/'));
for (let filename of groups) {
    require('../Game/room_setup/tiles/' + filename);
}