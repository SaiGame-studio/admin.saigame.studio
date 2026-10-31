import { ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { saiPlayShopUrl } from "@/lib/sai-play";

type Props = {
  gameId: string;
  shopId: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
  labels: { title: string; hint: string; on: string; off: string; open: string };
};

const SAI_PLAY_NAME = "Sai Play";

/** "Show in Sai Play" toggle for a shop, with a link to the shop on Sai Play when it is shown. */
export function ShopSaiPlayField({ gameId, shopId, checked, disabled, onCheckedChange, labels }: Props) {
  const shopUrl = saiPlayShopUrl(gameId, shopId);
  const nameIndex = labels.title.indexOf(SAI_PLAY_NAME);
  return <div id="shop-detail-sai-play" className="flex items-start gap-3 min-h-[32px] pt-2">
    <span id="shop-detail-sai-play-label" className="text-xs text-muted-foreground/60 w-24 shrink-0 pt-1 select-none">
      {nameIndex < 0 ? labels.title : (<>
          {labels.title.slice(0, nameIndex)}
          <a id="shop-detail-sai-play-label-link" href={shopUrl} className="text-primary hover:underline">{SAI_PLAY_NAME}</a>
          {labels.title.slice(nameIndex + SAI_PLAY_NAME.length)}
        </>)}
    </span>
    <div id="shop-detail-sai-play-body" className="flex-1 space-y-1">
      <div id="shop-detail-sai-play-controls" className="flex items-center gap-2 flex-wrap">
        <Switch id="shop-detail-sai-play-switch" checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} aria-label={labels.title}/>
        <span id="shop-detail-sai-play-status" className="text-sm text-muted-foreground">{checked ? labels.on : labels.off}</span>
        {checked && (<a id="shop-detail-sai-play-link" href={shopUrl} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <ExternalLink id="shop-detail-sai-play-link-icon" className="h-3.5 w-3.5"/>
            {labels.open}
          </a>)}
      </div>
      <p id="shop-detail-sai-play-hint" className="text-xs text-muted-foreground">{labels.hint}</p>
    </div>
  </div>;
}
