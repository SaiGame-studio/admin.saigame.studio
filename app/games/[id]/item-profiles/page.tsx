"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatTimestamp } from "@/lib/utils/date-utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getGame } from "@/lib/game-api";
import { ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, X } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb";
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { fetchGameItemProfiles, createItemProfile, updateItemProfile, ItemProfile } from "@/lib/item-profile-api";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Pencil, Save } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { getAllStatusOptions, getEditableStatusOptions, getItemProfileStatusConfig } from "@/lib/utils/item-profile-status";
import { StatusBadge } from "@/components/ItemProfileStatus";
import { getInventoryTabUrl, isInventoryType } from "@/lib/utils/item-profile-utils";
import { InventoryLink } from "@/components/ui/inventory-link";
import { LootboxLink } from "@/components/ui/lootbox-link";
import { getItemTypeOptions } from "@/lib/utils/item-type-utils";

export default function GameItemProfilesPage() {
  const params = useParams() as { id: string };
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);
  const [itemProfiles, setItemProfiles] = useState<ItemProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [gameName, setGameName] = useState<string>("");
  const [game, setGame] = useState<any>(null);
  const [quickProfileName, setQuickProfileName] = useState("");
  const [quickProfileLoading, setQuickProfileLoading] = useState(false);
  const [createProfileError, setCreateProfileError] = useState<{ message: string; hints: string[] } | null>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);
  const [editingStatus, setEditingStatus] = useState<{ [key: string]: boolean }>({});
  const [statusValues, setStatusValues] = useState<{ [key: string]: string }>({});
  const [statusLoading, setStatusLoading] = useState<{ [key: string]: boolean }>({});
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [nameFilter, setNameFilter] = useState<string>("");

  // Lọc ra các trạng thái error vì chỉ server mới được set
  const editableStatuses = getEditableStatusOptions();

  // Available status options for filter
  const statusOptions = getAllStatusOptions();

  // Available item type options for filter
  const itemTypeOptions = getItemTypeOptions();

  // Filter profiles based on status, type and name
  const filteredProfiles = itemProfiles.filter(profile => {
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(profile.status);
    const matchesType = typeFilter.length === 0 || (profile.type && typeFilter.includes(profile.type));
    const matchesName = nameFilter.trim() === "" || 
      profile.name.toLowerCase().includes(nameFilter.toLowerCase()) ||
      profile.code_name.toLowerCase().includes(nameFilter.toLowerCase());
    return matchesStatus && matchesType && matchesName;
  });

  // Toggle status filter
  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Toggle type filter
  const toggleTypeFilter = (type: string) => {
    setTypeFilter(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Clear all filters
  const clearAllFilters = () => {
    setStatusFilter([]);
    setTypeFilter([]);
    setNameFilter("");
  };

  // Clear name filter only
  const clearNameFilter = () => {
    setNameFilter("");
  };

  useEffect(() => {
    async function loadItemProfilesAndGame() {
      try {
        setLoading(true);
        const [gameData, profiles] = await Promise.all([
          getGame(params.id),
          fetchGameItemProfiles(params.id)
        ]);
        setGameName(gameData.name);
        setGame(gameData);
        setItemProfiles(profiles);
        
        // Initialize status values
        const statusValuesMap: { [key: string]: string } = {};
        profiles.forEach(profile => {
          statusValuesMap[profile.id] = profile.status;
        });
        setStatusValues(statusValuesMap);
        
        setError(null);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    loadItemProfilesAndGame();
  }, [params.id]);

  async function handleQuickCreateProfile() {
    if (!quickProfileName.trim()) return;
    setQuickProfileLoading(true);
    setCreateProfileError(null);
    try {
      const newProfile = await createItemProfile(params.id, { name: quickProfileName });
      setQuickProfileName("");
      if (quickInputRef.current) quickInputRef.current.value = "";
      
      // Chuyển hướng đến trang detail của profile mới tạo
      router.push(`/games/${params.id}/item-profiles/${newProfile.id}`);
    } catch (e: any) {
      if (e && typeof e === 'object' && 'message' in e && 'hints' in e) {
        setCreateProfileError({ message: e.message, hints: Array.isArray(e.hints) ? e.hints : [] });
      } else {
        setCreateProfileError({ message: e?.message || 'Failed to create item profile', hints: [] });
      }
    } finally {
      setQuickProfileLoading(false);
    }
  }

  function handleEditStatus(profileId: string) {
    setEditingStatus(prev => ({ ...prev, [profileId]: true }));
  }

  async function handleSaveStatus(profileId: string) {
    const newStatus = statusValues[profileId];
    setStatusLoading(prev => ({ ...prev, [profileId]: true }));
    
    try {
      const updatedProfile = await updateItemProfile(profileId, { status: newStatus });
      
      // Sử dụng thông tin mới nhất từ API để update toàn bộ profile trong danh sách
      setItemProfiles(prev => prev.map(profile => 
        profile.id === profileId ? updatedProfile : profile
      ));
      
      // Cập nhật statusValues với giá trị mới từ server
      setStatusValues(prev => ({ ...prev, [profileId]: updatedProfile.status }));
      
      setEditingStatus(prev => ({ ...prev, [profileId]: false }));
    } catch (e: any) {
      // Reset status value on error
      setStatusValues(prev => ({ 
        ...prev, 
        [profileId]: itemProfiles.find(p => p.id === profileId)?.status || '' 
      }));
    } finally {
      setStatusLoading(prev => ({ ...prev, [profileId]: false }));
    }
  }

  function handleCancelEditStatus(profileId: string) {
    const originalStatus = itemProfiles.find(p => p.id === profileId)?.status || '';
    setStatusValues(prev => ({ ...prev, [profileId]: originalStatus }));
    setEditingStatus(prev => ({ ...prev, [profileId]: false }));
  }

  if (loading) {
    return <div className="container mx-auto py-6">{t('common.loading')}</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive mb-4">
          <CardHeader>
            <CardTitle>{t('common.error')}</CardTitle>
            <CardDescription>{t('itemProfile.loadError')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-2">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href={`/studios/${game?.studio?.id}`}>{game?.studio?.name || t('common.studio')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${params.id}`}>{gameName || t('common.game')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span className="text-muted-foreground">{t('itemProfile.title')}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('itemProfile.title')}</h1>
          <p className=" text-base">{t('itemProfile.listDesc')} {gameName && (
            <Link href={`/games/${params.id}`} className="text-lg font-normal text-muted-foreground inline-flex items-center gap-1 hover:text-primary">
              {gameName}
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </Link>
          )}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{t('itemProfile.filters')}:</span>
            
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                className="border rounded px-3 py-2 bg-background text-foreground pr-8"
                placeholder={t('itemProfile.searchPlaceholder')}
                value={nameFilter}
                onChange={e => setNameFilter(e.target.value)}
                style={{ minWidth: 200 }}
              />
              {nameFilter && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                  onClick={clearNameFilter}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* Status Dropdown */}
            <Popover>
              <PopoverTrigger>
                <Button variant="outline" size="sm">
                  {statusFilter.length > 0 ? `${statusFilter.length} ${t('itemProfile.selected')}` : t('itemProfile.selectStatus')}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px]">
                <div className="flex flex-col gap-2">
                  {statusOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.value}
                        checked={statusFilter.includes(option.value)}
                        onCheckedChange={(checked) => toggleStatusFilter(option.value)}
                      />
                      <label
                        htmlFor={option.value}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                      >
                        <StatusBadge status={option.value} />
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Type Dropdown */}
            <Popover>
              <PopoverTrigger>
                <Button variant="outline" size="sm">
                  {typeFilter.length > 0 ? `${typeFilter.length} ${t('itemProfile.selected')}` : t('itemProfile.selectType')}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px]">
                <div className="flex flex-col gap-2">
                  {itemTypeOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.value}
                        checked={typeFilter.includes(option.value)}
                        onCheckedChange={(checked) => toggleTypeFilter(option.value)}
                      />
                      <label
                        htmlFor={option.value}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Results Count */}
            <span className="text-sm text-muted-foreground">
              {(statusFilter.length > 0 || typeFilter.length > 0 || nameFilter.trim() !== "") ? (
                `${t('itemProfile.showing')}: ${filteredProfiles.length} / ${itemProfiles.length}`
              ) : (
                `${t('itemProfile.total')}: ${itemProfiles.length}`
              )}
            </span>
          </div>

          {/* Create Profile Section */}
          <div className="flex gap-2 items-center">
            <input
              ref={quickInputRef}
              type="text"
              className="border rounded px-2 py-1 bg-background text-foreground"
              placeholder={t('itemProfile.quickNamePlaceholder')}
              value={quickProfileName}
              onChange={e => setQuickProfileName(e.target.value)}
              disabled={quickProfileLoading}
              onKeyDown={e => { if (e.key === 'Enter') handleQuickCreateProfile() }}
              style={{ minWidth: 160 }}
            />
            <Button onClick={handleQuickCreateProfile} disabled={quickProfileLoading || !quickProfileName.trim()}>
              {quickProfileLoading ? t('itemProfile.creating') : t('itemProfile.create')}
            </Button>
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {(statusFilter.length > 0 || typeFilter.length > 0 || nameFilter.trim() !== "") && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{t('itemProfile.activeFilters')}:</span>
          
          {/* Name Filter Badge */}
          {nameFilter.trim() !== "" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {t('itemProfile.searchByName')}: "{nameFilter}"
              <X 
                className="h-3 w-3 cursor-pointer hover:bg-destructive hover:text-destructive-foreground rounded-full" 
                onClick={clearNameFilter}
              />
            </Badge>
          )}
          
          {/* Status Filter Badges */}
          {statusFilter.map((status) => {
            const statusOption = statusOptions.find(opt => opt.value === status);
            return (
              <Badge key={status} variant="secondary" className="flex items-center gap-1">
                {statusOption?.label}
                <X 
                  className="h-3 w-3 cursor-pointer hover:bg-destructive hover:text-destructive-foreground rounded-full" 
                  onClick={() => toggleStatusFilter(status)}
                />
              </Badge>
            );
          })}
          
          {/* Type Filter Badges */}
          {typeFilter.length > 0 && typeFilter.map((type) => {
            const typeOption = itemTypeOptions.find(opt => opt.value === type);
            return (
              <Badge key={type} variant="secondary" className="flex items-center gap-1">
                {typeOption?.label || type}
                <X 
                  className="h-3 w-3 cursor-pointer hover:bg-destructive hover:text-destructive-foreground rounded-full" 
                  onClick={() => toggleTypeFilter(type)}
                />
              </Badge>
            );
          })}
          
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 px-2 text-xs">
            {t('itemProfile.clearAll')}
          </Button>
        </div>
      )}

      {createProfileError && (
        <Alert variant="destructive" className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <div>
              <AlertTitle>{t('common.error')}</AlertTitle>
              <AlertDescription>
                {typeof createProfileError === 'string' ? createProfileError : createProfileError.message}
                {Array.isArray(createProfileError?.hints) && createProfileError.hints.length > 0 && (
                  <ul className="mt-2 list-disc list-inside text-base text-destructive">
                    {createProfileError.hints.map((hint, idx) => (
                      <li key={idx}>{hint}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCreateProfileError(null)}>
            <X className="w-4 h-4" />
          </Button>
        </Alert>
      )}
      {itemProfiles.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('itemProfile.noProfiles')}</CardTitle>
            <CardDescription>{t('itemProfile.noProfilesDesc')}</CardDescription>
          </CardHeader>
        </Card>
      ) : filteredProfiles.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('itemProfile.noFilteredProfiles')}</CardTitle>
            <CardDescription>{t('itemProfile.noFilteredProfilesDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={clearAllFilters}>
              {t('itemProfile.clearFilter')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map((profile) => (
            <Card key={profile.id} className="overflow-hidden group">
              <div className="grid grid-cols-3 gap-4 p-6">
                {/* Left column - Item Properties */}
                <div className="col-span-2">
                  <CardTitle className="text-xl font-mono mb-2">
                    <Link href={`/games/${params.id}/item-profiles/${profile.id}`} className="inline-flex items-center gap-1 min-w-0 max-w-full">
                      <span className="truncate min-w-0" title={profile.name}>{profile.name}</span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </Link>
                  </CardTitle>
                  <CardDescription className="mb-3">{t('itemProfile.code')}: {profile.code_name}</CardDescription>
                  
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex items-center gap-2">
                      {editingStatus[profile.id] ? (
                        <>
                          <span>{t('itemProfile.status')}:</span>
                          <Select 
                            value={statusValues[profile.id] || profile.status} 
                            onValueChange={value => setStatusValues(prev => ({ ...prev, [profile.id]: value }))}
                            disabled={statusLoading[profile.id]}
                          >
                            <SelectTrigger className="w-40 h-6 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {editableStatuses.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6"
                            onClick={() => handleSaveStatus(profile.id)} 
                            disabled={statusLoading[profile.id]}
                          >
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6"
                            onClick={() => handleCancelEditStatus(profile.id)} 
                            disabled={statusLoading[profile.id]}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span>{t('itemProfile.status')}:</span>
                            <span 
                              className="font-semibold"
                              style={{ 
                                color: (() => {
                                  const config = getItemProfileStatusConfig(profile.status);
                                  switch (config.textColor) {
                                    case 'text-green-600': return '#16a34a';
                                    case 'text-yellow-600': return '#ca8a04';
                                    case 'text-red-600': return '#dc2626';
                                    default: return 'inherit';
                                  }
                                })()
                              }}
                              title={`Status: ${profile.status}, Color: ${getItemProfileStatusConfig(profile.status).textColor}`}
                            >
                              {profile.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleEditStatus(profile.id)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                    <span>{t('itemProfile.type')}: {profile.type || '-'}</span>
                    <span>{t('itemProfile.level')}: {profile.level_start} - {profile.level_max}</span>
                    <span>{t('itemProfile.stackLimit')}: {profile.stack_limit}</span>
                    <span>{t('itemProfile.createOnRegistry')}: {profile.create_on_registry ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                
                {/* Right column - Buttons */}
                <div className="col-span-1 flex flex-col gap-2 justify-start">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/games/${params.id}/item-profiles/${profile.id}`}>{t('itemProfile.viewDetails')}</Link>
                  </Button>
                  <InventoryLink gameId={params.id} itemProfile={profile} />
                  <LootboxLink gameId={params.id} itemProfile={profile} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 