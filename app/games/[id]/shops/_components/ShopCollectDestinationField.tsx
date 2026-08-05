import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ShopCollectDestination } from "@/lib/shop-admin-api";

type Props = {
  value: ShopCollectDestination;
  onValueChange: (value: ShopCollectDestination) => void;
  labels: { title: string; mailbox: string; inventory: string; mailboxHint: string; inventoryHint: string };
};

export function ShopCollectDestinationField({ value, onValueChange, labels }: Props) {
  return <div id="shop-create-delivery-destination" className="space-y-1.5">
    <Label htmlFor="shop-create-collect-destination">{labels.title}</Label>
    <Select value={value} onValueChange={(next) => onValueChange(next as ShopCollectDestination)}>
      <SelectTrigger id="shop-create-collect-destination"><SelectValue /></SelectTrigger>
      <SelectContent id="shop-create-collect-destination-options">
        <SelectItem id="shop-create-collect-destination-mailbox" value="mailbox">{labels.mailbox}</SelectItem>
        <SelectItem id="shop-create-collect-destination-inventory" value="inventory">{labels.inventory}</SelectItem>
      </SelectContent>
    </Select>
    <p id="shop-create-delivery-destination-hint" className="text-xs text-muted-foreground">{value === "inventory" ? labels.inventoryHint : labels.mailboxHint}</p>
  </div>;
}
