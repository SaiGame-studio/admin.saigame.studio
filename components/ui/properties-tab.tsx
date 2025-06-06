"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Plus, Pencil, Save, X, Eye, EyeOff } from "lucide-react"
import { 
  getItemProfileProperties, 
  createItemProfileProperty, 
  updateItemProfileProperty, 
  deleteItemProfileProperty,
  ItemProperty,
  CreatePropertyRequest,
  UpdatePropertyRequest
} from "@/lib/item-profile-api"
import { formatTimestamp } from "@/lib/utils/date-utils"
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"

interface PropertiesTabProps {
  itemProfileId: string
}

interface PropertyFormData {
  name: string
  type: string
  value: string
  description: string
  is_required: boolean
  is_visible: boolean
  metadata: string
}

const PROPERTY_TYPES = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'array', label: 'List' },
  { value: 'object', label: 'Object' }
]

export function PropertiesTab({ itemProfileId }: PropertiesTabProps) {
  const { locale } = useLanguage()
  const { t } = useTranslation(locale)
  
  const [properties, setProperties] = useState<ItemProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    type: 'string',
    value: '',
    description: '',
    is_required: false,
    is_visible: true,
    metadata: '{}'
  })

  // Load properties
  const loadProperties = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getItemProfileProperties(itemProfileId)
      setProperties(data)
    } catch (err: any) {
      setError(err.message || "Failed to load properties")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProperties()
  }, [itemProfileId])

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      type: 'string',
      value: '',
      description: '',
      is_required: false,
      is_visible: true,
      metadata: '{}'
    })
    setShowCreateForm(false)
    setEditingPropertyId(null)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    try {
      setIsSubmitting(true)
      setError(null)

      // Parse metadata JSON
      let metadata = {}
      try {
        if (formData.metadata.trim()) {
          metadata = JSON.parse(formData.metadata)
        }
      } catch {
        throw new Error("Invalid JSON in metadata field")
      }

             // Parse value based on type
       let parsedValue: any = formData.value
       if (formData.type === 'number') {
         parsedValue = Number(formData.value)
         if (isNaN(parsedValue as number)) {
           throw new Error("Invalid number value")
         }
       } else if (formData.type === 'boolean') {
         parsedValue = formData.value === 'true'
       } else if (formData.type === 'array' || formData.type === 'object') {
        try {
          parsedValue = JSON.parse(formData.value)
        } catch {
          throw new Error(`Invalid JSON for ${formData.type} type`)
        }
      }

      const propertyData = {
        name: formData.name,
        type: formData.type,
        value: parsedValue,
        description: formData.description || undefined,
        is_required: formData.is_required,
        is_visible: formData.is_visible,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined
      }

      if (editingPropertyId) {
        // Update existing property
        await updateItemProfileProperty(itemProfileId, editingPropertyId, propertyData as UpdatePropertyRequest)
      } else {
        // Create new property
        await createItemProfileProperty(itemProfileId, propertyData as CreatePropertyRequest)
      }

      await loadProperties()
      resetForm()
    } catch (err: any) {
      setError(err.message || "Failed to save property")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle edit
  const handleEdit = (property: ItemProperty) => {
    setFormData({
      name: property.name,
      type: property.type,
      value: typeof property.value === 'object' ? JSON.stringify(property.value, null, 2) : String(property.value),
      description: property.description || '',
      is_required: property.is_required,
      is_visible: property.is_visible,
      metadata: property.metadata ? JSON.stringify(property.metadata, null, 2) : '{}'
    })
    setEditingPropertyId(property.id || null)
    setShowCreateForm(true)
  }

  // Handle delete
  const handleDelete = async (propertyId: string) => {
    try {
      setError(null)
      await deleteItemProfileProperty(itemProfileId, propertyId)
      await loadProperties()
    } catch (err: any) {
      setError(err.message || "Failed to delete property")
    }
  }

  // Format value for display
  const formatValue = (value: any, type: string) => {
    if (type === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    return String(value)
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        {t('common.loading')}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg p-4 bg-destructive/10">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t('properties.title')} ({properties.length})
        </h3>
        <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
          <Plus className="w-4 h-4 mr-2" />
          {t('properties.addProperty')}
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingPropertyId ? t('properties.editProperty') : t('properties.createProperty')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">{t('properties.propertyName')} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="type">{t('properties.propertyType')} *</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="value">{t('properties.propertyValue')} *</Label>
                {formData.type === 'boolean' ? (
                  <Select 
                    value={formData.value} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, value }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                ) : formData.type === 'array' || formData.type === 'object' ? (
                  <Textarea
                    id="value"
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    placeholder={formData.type === 'array' ? '["item1", "item2"]' : '{"key": "value"}'}
                    required
                    disabled={isSubmitting}
                    rows={3}
                  />
                ) : (
                  <Input
                    id="value"
                    type={formData.type === 'number' ? 'number' : 'text'}
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    required
                    disabled={isSubmitting}
                  />
                )}
              </div>

              <div>
                <Label htmlFor="description">{t('properties.propertyDescription')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  disabled={isSubmitting}
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="required"
                    checked={formData.is_required}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_required: !!checked }))}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="required">{t('properties.isRequired')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="visible"
                    checked={formData.is_visible}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_visible: !!checked }))}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="visible">{t('properties.isVisible')}</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="metadata">{t('properties.metadata')} (JSON)</Label>
                <Textarea
                  id="metadata"
                  value={formData.metadata}
                  onChange={(e) => setFormData(prev => ({ ...prev, metadata: e.target.value }))}
                  placeholder='{"min": 0, "max": 100, "unit": "points"}'
                  disabled={isSubmitting}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
                  {isSubmitting ? (
                    t('common.loading')
                  ) : editingPropertyId ? (
                    t('properties.updateProperty')
                  ) : (
                    t('properties.createProperty')
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Properties List */}
      {properties.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p className="mb-2">{t('properties.noProperties')}</p>
            <p className="text-sm">{t('properties.noPropertiesDesc')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {properties.map((property) => (
            <Card key={property.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{property.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {PROPERTY_TYPES.find(t => t.value === property.type)?.label || property.type}
                    </Badge>
                    {property.is_required && (
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    )}
                    {property.is_visible ? (
                      <div className="w-4 h-4 text-green-600" title="Visible">
                        <Eye className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 text-gray-400" title="Hidden">
                        <EyeOff className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm">
                    <span className="font-medium">Value: </span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      {formatValue(property.value, property.type)}
                    </code>
                  </div>
                  
                  {property.description && (
                    <p className="text-sm text-muted-foreground">{property.description}</p>
                  )}
                  
                  {property.metadata && Object.keys(property.metadata).length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Metadata: </span>
                      <code className="bg-muted px-1 rounded">
                        {JSON.stringify(property.metadata)}
                      </code>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    {t('itemProfile.updatedAt')}: {formatTimestamp(property.updated_at || 0)}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(property)}
                    disabled={showCreateForm}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
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
                        <AlertDialogAction
                          onClick={() => property.id && handleDelete(property.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('common.delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 