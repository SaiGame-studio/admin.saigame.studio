"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getItemTypeOptions, getItemTypeLabel } from "@/lib/utils/item-type-utils"
import { Edit, Settings, Code } from "lucide-react"

export default function ItemTypesConfigPage() {
  const [itemTypes] = useState(getItemTypeOptions())

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="w-8 h-8" />
          Item Type Configuration
        </h1>
        <p className="text-muted-foreground mt-2">
          Centralized management of item types across the application
        </p>
      </div>

      <div className="grid gap-6">
        {/* Current Item Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                Current Item Types
              </Badge>
              <span className="text-sm text-muted-foreground">({itemTypes.length} types)</span>
            </CardTitle>
            <CardDescription>
              These item types are used across all dropdowns in the application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {itemTypes.map((type, index) => (
                <div key={type.value} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {index + 1}
                    </Badge>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-muted-foreground font-mono">
                        value: "{type.value}"
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Active
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* How to Modify */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              How to Modify Item Types
            </CardTitle>
            <CardDescription>
              To add, remove, or modify item types, edit the centralized configuration file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm font-medium mb-2">File Location:</div>
              <code className="text-sm bg-background px-2 py-1 rounded border">
                lib/utils/item-type-utils.ts
              </code>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium mb-1">✅ To add a new item type:</div>
                <div className="text-sm text-muted-foreground">
                  Add a new object to the ITEM_TYPE_OPTIONS array with value and label
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-1">✅ To remove an item type:</div>
                <div className="text-sm text-muted-foreground">
                  Remove the corresponding object from the ITEM_TYPE_OPTIONS array
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-1">✅ To modify labels:</div>
                <div className="text-sm text-muted-foreground">
                  Change the "label" property of the corresponding object
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-1">💡 Automatic Sync</div>
              <div className="text-sm text-blue-700">
                Changes to this file will automatically update all item type dropdowns across:
                <ul className="list-disc list-inside mt-1 ml-2">
                  <li>Item Profile List filters</li>
                  <li>Item Profile Detail edit forms</li>
                  <li>Create Item Profile forms</li>
                  <li>Any other components using getItemTypeOptions()</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Example Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Example: Testing Item Type Functions</CardTitle>
            <CardDescription>
              See how the centralized functions work with current data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Function: getItemTypeLabel()</div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>getItemTypeLabel("equipment") → "{getItemTypeLabel("equipment")}"</div>
                  <div>getItemTypeLabel("fixed_loot_box") → "{getItemTypeLabel("fixed_loot_box")}"</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">All Available Values:</div>
                <div className="text-xs text-muted-foreground">
                  {itemTypes.map(t => t.value).join(", ")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 