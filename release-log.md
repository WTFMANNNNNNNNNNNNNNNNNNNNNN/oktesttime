# Client
## Additions
- Health, name, and chat of entities fade when they go off-screen
- Entity size change animation
- Added `drawButton`, a function that lets you draw buttons like "exit" and "respawn" on the death screen or elsewhere
- Added exit and respawn button
## Changes
- New image handler
- New death screen animation
- New latency system
- Better changelog (from arras.cx)
- Reworked chat box
- Changed animations (leaderboard and more)

# Server
## Additions
- Added a sandbox mode
- Added siege maps
- Added arras arms race bosses
- Added arras scrapped tanks and some more vanilla-like tanks to the basic upgrade tree
- Added shiny member menu
- Added devboss for Helena
- Added HSHGW (Hierarchical Spatial Hash Grid Why)
- Added labyrinth gamemode
- Added tag gamemode from diep
- Added presents (polygons) for Christmas
- Added `gameManager` (Very important)
- Added `NO_LIMITATIONS`. Use it for making bullets with turrets (overdrive), etc.
- Added shaders to the game (in `server\lib\addons\shaders.js`)
## Changes
- Dreadnoughts V2 Changes
- Fixed sizes and properties of some definitions to make them more arras-like
- Revamped generators (boss generators and more)
- Second room rework, made even better
- Finally changed the skill points at level 45 from 44 to 42 like arras
- Fixed shield capacity and regen being WAYY too high
- Marksman and fork now work as intended
- Server update refresh rate has changed back to 30HZ, resulting having a smooth gameplay.
- The addons have been split into 2. The definitions addons are for mainly tanks only. The game addons are for coding stuff. (The reason why i did this because if you reload definitions `$dev reloaddefs` it reloads the addons too, running your code twice and its not gonna work, so thats why i split the addons.)
- The tank color will no longer get changed after define gets activated, meaning the current color will stay. 
## Removals
- Removed `StatusEffect` because nobody used it or knew how to use it

# Client and Server
## Changes
- Tank speed fix
- Optimized food loop, collisions, sockets, HSHG, entities, camera, the whole project...
- Debloated
## Additions
- Added controller support
- Added multiple servers and a server picker
- Added arras sandbox commands

# Other
- Changed the folder structure. It'll take a while to get used to, but once you do, it's better.
- Added `GLITCH_MODE` (see line 19 of config for description)
- Added `LOAD_MOCKUPS` (see line 14 of config for description)
- Some features from old aps++ are missing, will be fixed on next beta or add it by yourself.

# NOTE FROM DEVELOPER

The server may studder and we do not know whats causing it but we will try our best to fix it.