"use client";
import { useTranslation } from "@/lib/i18n/use-translation";
import { SectionHeading } from "./section-heading";
import { ZoomableImage } from "./zoomable-image";

const LUA_POINTS = ["templates", "sandbox", "unity"];
// Unity Editor: Lua Script Manager creating templates and uploading .lua scripts to Sai Server.
const LUA_IMAGE = { src: "/why-sai-server/Server-side-Lua-scripting.jpg", width: 784, height: 851 };

const SAMPLE_SCRIPT = `-- Daily login bonus, scaled by streak
local def, err = game.get_item_def_by_code("gold_coin")
if err ~= nil then error(err) end

local amount = 100 + (payload.streak or 0) * 10
local e = game.grant_item(def.id, amount)
if e ~= nil then
  output.error = e
  return
end

output.granted = amount
game.log("bonus for " .. ctx.player_id)`;

export function LuaSection() {
    const { t } = useTranslation();
    return (<section id="why-sai-server-lua" className="grid items-center gap-10 border-t py-16 lg:grid-cols-2">
      <div id="why-sai-server-lua-copy" className="why-sai-server-lua-copy min-w-0">
        <SectionHeading sectionId="why-sai-server-lua" eyebrow={t("whySaiServer.lua.eyebrow")} title={t("whySaiServer.lua.title")} description={t("whySaiServer.lua.description")}/>
        <ul id="why-sai-server-lua-points" className="mt-6 list-disc space-y-2 pl-5 text-sm">
          {LUA_POINTS.map((point) => (<li id={`why-sai-server-lua-point-${point}`} key={point}>{t(`whySaiServer.lua.points.${point}`)}</li>))}
        </ul>
        <div id="why-sai-server-lua-sample" className="why-sai-server-lua-sample mt-8 min-w-0 overflow-hidden rounded-xl border bg-card">
          <div id="why-sai-server-lua-sample-filename" className="why-sai-server-lua-sample-filename border-b bg-muted/50 px-4 py-2 font-mono text-xs text-muted-foreground">daily_bonus.lua</div>
          <pre id="why-sai-server-lua-sample-code" className="why-sai-server-lua-sample-code overflow-x-auto p-4 font-mono text-[13px] leading-relaxed"><code>{SAMPLE_SCRIPT}</code></pre>
        </div>
      </div>
      <ZoomableImage id="why-sai-server-lua-screenshot" {...LUA_IMAGE} alt={t("whySaiServer.lua.screenshotAlt")} caption={t("whySaiServer.lua.screenshotCaption")} zoomLabel={t("whySaiServer.integration.screenshotZoom")}/>
    </section>);
}
