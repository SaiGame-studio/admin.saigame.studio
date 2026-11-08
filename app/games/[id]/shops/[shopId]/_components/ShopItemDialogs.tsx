"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetTitle, } from "@/components/ui/sheet";
import { AlertCircle, Loader2 } from "lucide-react";
import { ItemForm } from "./ShopItemForm";
import { ShopItemSheetContent } from "./ShopItemSheetContent";
import type { ShopDetailViewState } from "./use-shop-detail";
export function ShopItemDialogs(state: ShopDetailViewState) {
    const { params, shop, error, itemDefs, itemDefsLoading, addOpen, setAddOpen, addForm, addError, adding, editOpen, setEditOpen, editItem, editForm, editError, editing, deleteOpen, setDeleteOpen, deleteItem, deleting, deleteError, pendingToggle, setPendingToggle, toggling, setAddField, handleAdd, setEditField, handleEdit, handleDelete, confirmToggleActive } = state;
    return <>
        <Sheet open={addOpen} onOpenChange={setAddOpen}>
            <ShopItemSheetContent id="shop-add-item-panel">
                <SheetHeader>
                    <SheetTitle>Add Item to Shop</SheetTitle>
                    <SheetDescription>Select an item definition and configure its shop settings.</SheetDescription>
                </SheetHeader>
                <div id="shop-add-item-panel-body" className="min-h-0 flex-1 overflow-y-auto py-2 pr-4">
                    <ItemForm form={addForm} setField={setAddField} itemDefs={itemDefs} itemDefsLoading={itemDefsLoading} error={addError} gameId={params.id} />
                </div>
                <SheetFooter className="pt-2">
                    <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
                        Cancel
                    </Button>
                    <Button onClick={handleAdd} disabled={adding}>
                        {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Add Item
                    </Button>
                </SheetFooter>
            </ShopItemSheetContent>
        </Sheet>

        {/* ── Edit Item Dialog ──────────────────────────────────────── */}
        <Sheet open={editOpen} onOpenChange={setEditOpen}>
            <ShopItemSheetContent id="shop-edit-item-panel">
                <SheetHeader>
                    <SheetTitle>Edit Item</SheetTitle>
                    <SheetDescription className="sr-only">Edit Item</SheetDescription>
                </SheetHeader>
                <div id="shop-edit-item-panel-body" className="min-h-0 flex-1 overflow-y-auto py-2 pr-4">
                    <ItemForm form={editForm} setField={setEditField} itemDefs={itemDefs} itemDefsLoading={false} error={editError} disableItemDef gameId={params.id} editItemId={editItem?.item_def_id} />
                </div>
                <SheetFooter className="pt-2">
                    <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editing}>
                        Cancel
                    </Button>
                    <Button onClick={handleEdit} disabled={editing}>
                        {editing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </SheetFooter>
            </ShopItemSheetContent>
        </Sheet>

        {/* ── Toggle Active Confirmation ────────────────────────────── */}
        <Dialog open={pendingToggle !== null} onOpenChange={(open) => {
            if (!open)
                setPendingToggle(null);
        }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{pendingToggle ? "Activate shop?" : "Deactivate shop?"}</DialogTitle>
                    <DialogDescription>
                        {pendingToggle
                            ? "This shop will become visible and purchasable by players."
                            : "This shop will be hidden from players and no longer purchasable."}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setPendingToggle(null)} disabled={toggling}>
                        Cancel
                    </Button>
                    <Button onClick={confirmToggleActive} disabled={toggling}>
                        {toggling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Confirm
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* ── Delete Confirmation ───────────────────────────────────── */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Remove Item</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to remove{" "}
                        <span className="font-semibold">{deleteItem?.display_name}</span> from this shop?
                        This action cannot be undone on the UI (soft-delete — history is preserved).
                    </DialogDescription>
                </DialogHeader>
                {deleteError && (<Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{deleteError}</AlertDescription>
                </Alert>)}
                <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                        {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Remove Item
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </>;
}
