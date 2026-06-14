"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Pencil, Save, X, Eye, EyeOff } from "lucide-react";
import { getItemProfileProperties, createItemProfileProperty, updateItemProfileProperty, deleteItemProfileProperty, ItemProperty, CreatePropertyRequest, UpdatePropertyRequest } from "@/lib/item-profile-api";
import { formatTimestamp } from "@/lib/utils/date-utils";
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
interface PropertiesTabProps {
    itemProfileId: string;
}
interface PropertyFormData {
    name: string;
    type: string;
    value: string;
    is_active: boolean;
    is_visible: boolean;
}
const PROPERTY_TYPES = [
    { value: 'string', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Yes/No' }
];
export function PropertiesTab({ itemProfileId }: PropertiesTabProps) {
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    const [properties, setProperties] = useState<ItemProperty[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newMetadataForms, setNewMetadataForms] = useState<{
        [propertyId: string]: string[];
    }>({});
    const [formData, setFormData] = useState<PropertyFormData>({
        name: '',
        type: 'string',
        value: '',
        is_active: true,
        is_visible: true
    });
    // Load properties
    const loadProperties = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getItemProfileProperties(itemProfileId);
            setProperties(data);
        }
        catch (err: any) {
            setError(err.message || "Failed to load properties");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadProperties();
    }, [itemProfileId]);
    // Reset form
    const resetForm = () => {
        setFormData({
            name: '',
            type: 'string',
            value: '',
            is_active: true,
            is_visible: true
        });
        setShowCreateForm(false);
        setEditingPropertyId(null);
    };
    // Add new metadata form
    const addNewMetadataForm = (propertyId: string) => {
        const newFormId = Date.now().toString();
        setNewMetadataForms(prev => ({
            ...prev,
            [propertyId]: [...(prev[propertyId] || []), newFormId]
        }));
    };
    // Remove metadata form
    const removeNewMetadataForm = (propertyId: string, formId: string) => {
        setNewMetadataForms(prev => ({
            ...prev,
            [propertyId]: (prev[propertyId] || []).filter(id => id !== formId)
        }));
    };
    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim())
            return;
        try {
            setIsSubmitting(true);
            setError(null);
            // Parse value based on type
            let parsedValue: any = formData.value;
            if (formData.type === 'number') {
                parsedValue = Number(formData.value);
                if (isNaN(parsedValue as number)) {
                    throw new Error("Invalid number value");
                }
            }
            else if (formData.type === 'boolean') {
                parsedValue = formData.value === 'true';
            }
            const propertyData = {
                name: formData.name,
                type: formData.type,
                value: parsedValue,
                is_active: formData.is_active,
                is_visible: formData.is_visible,
                metadata: {} // Start with empty metadata
            };
            if (editingPropertyId) {
                // Update existing property
                await updateItemProfileProperty(itemProfileId, editingPropertyId, propertyData as UpdatePropertyRequest);
            }
            else {
                // Create new property
                await createItemProfileProperty(itemProfileId, propertyData as CreatePropertyRequest);
            }
            await loadProperties();
            resetForm();
        }
        catch (err: any) {
            setError(err.message || "Failed to save property");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    // Handle edit
    const handleEdit = (property: ItemProperty) => {
        setFormData({
            name: property.name,
            type: property.type,
            value: typeof property.value === 'object' ? JSON.stringify(property.value, null, 2) : String(property.value),
            is_active: property.is_active,
            is_visible: property.is_visible
        });
        setEditingPropertyId(property.id || null);
        setShowCreateForm(true);
    };
    // Handle delete
    const handleDelete = async (propertyId: string) => {
        try {
            setError(null);
            await deleteItemProfileProperty(itemProfileId, propertyId);
            await loadProperties();
        }
        catch (err: any) {
            setError(err.message || "Failed to delete property");
        }
    };
    // Update property data
    const updatePropertyData = (updatedProperty: ItemProperty) => {
        setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p));
    };
    // Toggle is_active
    const toggleIsActive = async (property: ItemProperty) => {
        if (!property.id)
            return;
        try {
            setError(null);
            const updatedData = await updateItemProfileProperty(itemProfileId, property.id, { is_active: !property.is_active });
            updatePropertyData(updatedData);
        }
        catch (err: any) {
            setError(err.message || "Failed to update property");
        }
    };
    // Toggle is_visible
    const toggleIsVisible = async (property: ItemProperty) => {
        if (!property.id)
            return;
        try {
            setError(null);
            const updatedData = await updateItemProfileProperty(itemProfileId, property.id, { is_visible: !property.is_visible });
            updatePropertyData(updatedData);
        }
        catch (err: any) {
            setError(err.message || "Failed to update property");
        }
    };
    // Format value for display
    const formatValue = (value: any, type: string) => {
        if (type === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return String(value);
    };
    if (loading) {
        return (<div className="p-6 text-center">
        {t('common.loading')}
      </div>);
    }
    return (<div className="space-y-6">
      {error && (<div className="rounded-lg p-4 bg-destructive/10">
          <p className="text-destructive">{error}</p>
        </div>)}

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t('properties.title')} ({properties.length})
        </h3>
        <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
          <Plus className="w-4 h-4 mr-2"/>
          {t('properties.addProperty')}
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (<Card className="border-border/20">
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="type" className="text-xs font-medium">{t('properties.propertyType')} *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))} disabled={isSubmitting}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map(type => (<SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label htmlFor="name" className="text-xs font-medium">{t('properties.propertyName')} *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required disabled={isSubmitting} className="h-8"/>
                </div>
                <div className="col-span-4">
                  <Label htmlFor="value" className="text-xs font-medium">{t('properties.propertyValue')} *</Label>
                  {formData.type === 'boolean' ? (<Select value={formData.value} onValueChange={(value) => setFormData(prev => ({ ...prev, value }))} disabled={isSubmitting}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>) : (<Input id="value" type={formData.type === 'number' ? 'number' : 'text'} value={formData.value} onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))} required disabled={isSubmitting} className="h-8"/>)}
                </div>
                <div className="col-span-3 flex items-end justify-between">
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting || !formData.name.trim()} size="sm">
                      {isSubmitting ? t('common.loading') : (editingPropertyId ? 'Update' : 'Create')}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting} size="sm">
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>)}

      {/* Properties List */}
      {properties.length === 0 ? (<Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p className="mb-2">{t('properties.noProperties')}</p>
            <p className="text-sm">{t('properties.noPropertiesDesc')}</p>
          </CardContent>
        </Card>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((property, index) => (<div key={property.id} className="relative pl-4 border-l border-border/50 first:pl-0 first:border-l-0">
              <Card className="p-4 group border-none shadow-none">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium ${!property.is_active ? 'line-through text-muted-foreground' : ''}`}>
                      {property.name}
                    </h4>
                    {property.is_visible ? (<Eye className="w-4 h-4 text-green-600"/>) : (<EyeOff className="w-4 h-4 text-gray-400"/>)}
                  </div>
                  
                  <div className="text-sm">
                    <span className="font-medium">Value: </span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      {formatValue(property.value, property.type)}
                    </code>
                  </div>
                  
                  {property.description && (<p className="text-sm text-muted-foreground">{property.description}</p>)}
                  
                  {/* Metadata Section */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-medium">{t('properties.metadata')}</h5>
                    </div>
                    
                    <div className="pl-4 space-y-1">
                      {property.metadata && Object.keys(property.metadata).length > 0 ? (Object.entries(property.metadata).map(([key, value]) => (<PropertyMetadataEditable key={key} property={property} itemProfileId={itemProfileId} onPropertyUpdate={updatePropertyData} metadataKey={key} metadataValue={value}/>))) : (newMetadataForms[property.id || ''] || []).length === 0 ? (<p className="text-muted-foreground text-xs">{t('properties.noMetadata')}</p>) : null}
                      
                      {(newMetadataForms[property.id || ''] || []).length < 5 && (<button className="text-xs text-primary hover:text-primary/80 transition-colors font-medium" onClick={() => addNewMetadataForm(property.id || '')}>
                          + {t('properties.newMetadata')}
                        </button>)}
                      
                      {(newMetadataForms[property.id || ''] || []).map(formId => (<PropertyNewMetadataForm key={formId} formId={formId} property={property} itemProfileId={itemProfileId} onPropertyUpdate={updatePropertyData} onRemove={() => removeNewMetadataForm(property.id || '', formId)}/>))}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {t('itemProfile.updatedAt')}: {formatTimestamp(property.updated_at || 0)}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(property)} disabled={showCreateForm}>
                      <Pencil className="w-4 h-4"/>
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4"/>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('properties.deleteProperty')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('properties.confirmDeleteProperty')} <br />
                            <strong>{property.name}</strong><br />
                            {t('properties.deletePropertyText')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => property.id && handleDelete(property.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t('common.delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant={property.is_active ? "default" : "outline"} className="h-6 px-2 text-xs" onClick={() => toggleIsActive(property)}>
                      {property.is_active ? t('properties.isActive') : t('properties.inactive')}
                    </Button>
                    <Button size="sm" variant={property.is_visible ? "default" : "outline"} className="h-6 px-2 text-xs" onClick={() => toggleIsVisible(property)}>
                      {property.is_visible ? t('properties.visible') : t('properties.hidden')}
                    </Button>
                  </div>
                </div>
              </div>
              </Card>
            </div>))}
        </div>)}
    </div>);
}
// Component for editing existing metadata
function PropertyMetadataEditable({ property, itemProfileId, onPropertyUpdate, metadataKey, metadataValue }: {
    property: ItemProperty;
    itemProfileId: string;
    onPropertyUpdate: (updatedProperty: ItemProperty) => void;
    metadataKey: string;
    metadataValue: any;
}) {
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [key, setKey] = useState(metadataKey);
    const [value, setValue] = useState(String(metadataValue));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<{
        message: string;
        hints: string[];
    } | null>(null);
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    useEffect(() => {
        setKey(metadataKey);
        setValue(String(metadataValue));
    }, [metadataKey, metadataValue]);
    const handleSave = async () => {
        if (!key.trim()) {
            setError({ message: "Key name cannot be empty", hints: [] });
            return;
        }
        // Check if new key already exists (and it's different from current key)
        if (key !== metadataKey && property.metadata && property.metadata[key] !== undefined) {
            setError({ message: `Key "${key}" already exists`, hints: [] });
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // Create new metadata object
            const updatedMetadata = { ...property.metadata };
            // If key changed, remove old key
            if (key !== metadataKey) {
                delete updatedMetadata[metadataKey];
            }
            // Convert value to number if possible, otherwise keep as string
            let processedValue: any = value.trim();
            if (processedValue !== '' && !isNaN(Number(processedValue))) {
                const numValue = Number(processedValue);
                if (isFinite(numValue)) {
                    processedValue = numValue;
                }
            }
            // Set new/updated key with processed value
            updatedMetadata[key] = processedValue;
            const updatedData = await updateItemProfileProperty(itemProfileId, property.id!, { metadata: updatedMetadata });
            onPropertyUpdate(updatedData);
            setEditing(false);
        }
        catch (e: any) {
            if (e && typeof e === 'object' && 'message' in e && 'hints' in e) {
                setError({ message: e.message, hints: Array.isArray(e.hints) ? e.hints : [] });
            }
            else {
                setError({ message: e?.message || t('properties.updateError'), hints: [] });
            }
        }
        finally {
            setLoading(false);
        }
    };
    const handleDelete = async () => {
        setDeleting(true);
        setError(null);
        try {
            // Create new metadata object without the deleted key
            const updatedMetadata = { ...property.metadata };
            delete updatedMetadata[metadataKey];
            const updatedData = await updateItemProfileProperty(itemProfileId, property.id!, { metadata: updatedMetadata });
            onPropertyUpdate(updatedData);
        }
        catch (e: any) {
            if (e && typeof e === 'object' && 'message' in e && 'hints' in e) {
                setError({ message: e.message, hints: Array.isArray(e.hints) ? e.hints : [] });
            }
            else {
                setError({ message: e?.message || t('properties.deleteError'), hints: [] });
            }
        }
        finally {
            setDeleting(false);
        }
    };
    const handleCancel = () => {
        setEditing(false);
        setKey(metadataKey);
        setValue(String(metadataValue));
        setError(null);
    };
    return (<div className="flex flex-col gap-1 group">
      <div className="flex items-center gap-2">
        {editing ? (<>
            <Input value={key} onChange={e => setKey(e.target.value)} className="w-24 h-6 px-2 text-xs font-medium" disabled={loading} placeholder="Key"/>
            <span className="text-xs">:</span>
            <Input value={value} onChange={e => setValue(e.target.value)} className="w-32 h-6 px-2 text-xs" disabled={loading} placeholder="Value"/>
            <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading || !key.trim()} className="h-6 w-6">
              <Save className="w-3 h-3"/>
            </Button>
            <Button size="icon" variant="ghost" onClick={handleCancel} disabled={loading} className="h-6 w-6">
              <X className="w-3 h-3"/>
            </Button>
          </>) : (<>
            <span className="text-xs">{metadataKey}: <span className="font-medium">{String(metadataValue)}</span></span>
            <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil className="w-3 h-3"/>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" disabled={deleting}>
                  <Trash2 className="w-3 h-3"/>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('properties.confirmDeleteMetadata')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('properties.confirmDeleteMetadataText')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleting}>
                    {deleting ? t('common.deleting') : t('common.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </>)}
      </div>
      {error && (<div className="text-red-500 text-xs">
          <div>{error.message}</div>
          {Array.isArray(error.hints) && error.hints.length > 0 && (<ul className="mt-1 list-disc list-inside">
              {error.hints.map((hint, idx) => (<li key={idx}>{hint}</li>))}
            </ul>)}
        </div>)}
    </div>);
}
// Component for adding new metadata
function PropertyNewMetadataForm({ formId, property, itemProfileId, onPropertyUpdate, onRemove }: {
    formId: string;
    property: ItemProperty;
    itemProfileId: string;
    onPropertyUpdate: (updatedProperty: ItemProperty) => void;
    onRemove: () => void;
}) {
    const [key, setKey] = useState('');
    const [value, setValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<{
        message: string;
        hints: string[];
    } | null>(null);
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    const handleSave = async () => {
        if (!key.trim()) {
            setError({ message: "Key name cannot be empty", hints: [] });
            return;
        }
        // Check if key already exists
        if (property.metadata && property.metadata[key] !== undefined) {
            setError({ message: `Key "${key}" already exists`, hints: [] });
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // Create new metadata object
            const updatedMetadata = { ...property.metadata };
            // Convert value to number if possible, otherwise keep as string
            let processedValue: any = value.trim();
            if (processedValue !== '' && !isNaN(Number(processedValue))) {
                const numValue = Number(processedValue);
                if (isFinite(numValue)) {
                    processedValue = numValue;
                }
            }
            // Set new key with processed value
            updatedMetadata[key] = processedValue;
            const updatedData = await updateItemProfileProperty(itemProfileId, property.id!, { metadata: updatedMetadata });
            onPropertyUpdate(updatedData);
            // Remove this form after successful save
            onRemove();
        }
        catch (e: any) {
            if (e && typeof e === 'object' && 'message' in e && 'hints' in e) {
                setError({ message: e.message, hints: Array.isArray(e.hints) ? e.hints : [] });
            }
            else {
                setError({ message: e?.message || t('properties.updateError'), hints: [] });
            }
        }
        finally {
            setLoading(false);
        }
    };
    const handleCancel = () => {
        onRemove();
    };
    return (<div className="border rounded p-2 space-y-2 bg-muted/30">
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Key" value={key} onChange={e => setKey(e.target.value)} disabled={loading} className="h-6 text-xs"/>
        <Input placeholder="Value" value={value} onChange={e => setValue(e.target.value)} disabled={loading} className="h-6 text-xs"/>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={loading || !key.trim()} className="h-6 text-xs">
          {loading ? t('common.loading') : t('common.save')}
        </Button>
        <Button size="sm" variant="outline" onClick={handleCancel} disabled={loading} className="h-6 text-xs">
          {t('common.cancel')}
        </Button>
      </div>

      {error && (<div className="text-red-500 text-xs">
          <div>{error.message}</div>
          {Array.isArray(error.hints) && error.hints.length > 0 && (<ul className="mt-1 list-disc list-inside">
              {error.hints.map((hint, idx) => (<li key={idx}>{hint}</li>))}
            </ul>)}
        </div>)}
    </div>);
}
