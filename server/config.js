module.exports = {
    // Server host

    // Game server domain.
    // If the host is 'localhost:NUMBER', the NUMBER must be the port setting.
    host: "localhost:3000",

    // Which port to run the web server on.
    port: 3000,

    // Server

    // How often to update the list of the entities that players can see.
    // Has effects of when entities are activated.
    visibleListInterval: 250,

    // Start up logs and Log speed loop warnings
    LOGS: true,

    // If set to true, it loads all mockups and doesnt needs to generate while ingame. If set to false, does require need to generate mockups ingame but starts the main server instantly.
    LOAD_ALL_MOCKUPS: true,

    // Web Server

    // If you want to run your server on glitch.me or any other that doesn't support multi ports or doesnt have multi core, you are forced to set this to true because glitch or any other does NOT support multi ports.
    GLITCH_MODE: false,

    // Allow other servers to get data from this server.
    allowAccessControlAllowOrigin: false,

    // Miscellaneous

    // How long a chat message lasts in milliseconds.
    // Includes the fade-out period.
    CHAT_MESSAGE_DURATION: 15_000,

    // If you don't want your players to color their messages.
    // They get sanitized after addons interpret them, but before they're added to the chat message dictionary.
    SANITIZE_CHAT_MESSAGE_COLORS: true,

    // Welcome message once a player spawns.
    WELCOME_MESSAGE: "You have spawned! Welcome to the game.\n"
        + "You will be invulnerable until you move or shoot.\n"
        + "Please report any bugs you encounter!",

    // How long a popup message lasts before fading out in milliseconds.
    MESSAGE_DISPLAY_TIME: 10_000,

    // How long you have to wait to respawn in seconds.
    RESPAWN_TIMEOUT: 0,

    // Gameplay

    // How long (in ms) a socket can be disconnected without their player dying.
    maxHeartbeatInterval: 300000,

    // Where the bullet spawns, where 1 is fully outside the barrel and -1 is fully inside the barrel, and 0 is halfway between.
    bulletSpawnOffset: 1,

    // General damage multiplier everytime damage is dealt.
    DAMAGE_CONSTANT: 1,

    // General knockback multiplier everytime knockback is applied.
    KNOCKBACK_CONSTANT: 1.1,

    // TODO: Figure out how the math behind this works.
    GLASS_HEALTH_FACTOR: 2,

    // How strong the force is that confines entities to the map and portals apply to entities.
    ROOM_BOUND_FORCE: 0.01,

    // TODO: Find out what the intention behind the implementation of this configuration is.
    SOFT_MAX_SKILL: 0.59,

    // When an entity reaches a level, this function is called and returns how many points that entity gets for reaching that level.
    LEVEL_SKILL_POINT_FUNCTION: level => {
        if (level < 2) return 0;
        if (level <= 40) return 1;
        if (level <= 45 && level & 1 === 1) return 1;
        return 0;
    },

    // Maximum normally achievable level.
    LEVEL_CAP: 45,

    // Maximum level via the level-up key and auto-level-up.
    LEVEL_CHEAT_CAP: 45,

    // Default skill caps.
    MAX_SKILL: 9,

    // Amount of tank tiers.
    MAX_UPGRADE_TIER: 9,

    // Level difference between each tier.
    TIER_MULTIPLIER: 15,

    // Where the client's html is located.
    INDEX_HTML: "index.html",
}
