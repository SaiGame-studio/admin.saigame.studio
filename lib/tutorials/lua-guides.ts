/** Static copies of Lua Script, in source menu order. */
import type { StaticArticle, StaticArticleGroup } from "../tutorial-static-sections";

export const LUA_GUIDE_GROUPS: StaticArticleGroup[] = [
    {
        "key": "hello-world",
        "titleKey": "tutorials.luaGroups.hello-world"
    },
    {
        "key": "battle",
        "titleKey": "tutorials.luaGroups.battle"
    },
    {
        "key": "api-reference",
        "titleKey": "tutorials.luaGroups.api-reference"
    }
];

export const LUA_GUIDE_ARTICLES: StaticArticle[] = [
    {
        "slug": "hello-world",
        "titleKey": "tutorials.luaArticles.hello-world",
        "group": "hello-world"
    },
    {
        "slug": "enemy-definition",
        "titleKey": "tutorials.luaArticles.enemy-definition",
        "group": "battle"
    },
    {
        "slug": "entity-pool",
        "titleKey": "tutorials.luaArticles.entity-pool",
        "group": "battle"
    },
    {
        "slug": "3a-characters-preset",
        "titleKey": "tutorials.luaArticles.3a-characters-preset",
        "group": "battle"
    },
    {
        "slug": "execute-script",
        "titleKey": "tutorials.luaArticles.execute-script",
        "group": "battle"
    },
    {
        "slug": "overview",
        "titleKey": "tutorials.luaArticles.overview",
        "group": "api-reference"
    },
    {
        "slug": "inventory",
        "titleKey": "tutorials.luaArticles.inventory",
        "group": "api-reference"
    },
    {
        "slug": "gacha",
        "titleKey": "tutorials.luaArticles.gacha",
        "group": "api-reference"
    },
    {
        "slug": "quests",
        "titleKey": "tutorials.luaArticles.quests",
        "group": "api-reference"
    },
    {
        "slug": "events",
        "titleKey": "tutorials.luaArticles.events",
        "group": "api-reference"
    },
    {
        "slug": "entities",
        "titleKey": "tutorials.luaArticles.entities",
        "group": "api-reference"
    },
    {
        "slug": "6-presets",
        "titleKey": "tutorials.luaArticles.6-presets",
        "group": "api-reference"
    },
    {
        "slug": "equipment",
        "titleKey": "tutorials.luaArticles.equipment",
        "group": "api-reference"
    },
    {
        "slug": "battle-sessions",
        "titleKey": "tutorials.luaArticles.battle-sessions",
        "group": "api-reference"
    }
];
