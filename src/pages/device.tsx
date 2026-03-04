import * as React from "react";
import DashboardPageLayout from "@/components/dashboard/layout";
import AtomIcon from "@/components/icons/atom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageIcon, Plus, Search, SquarePen, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/src/components/common/confirm-dialog";
import { useStoreId } from "@/src/hooks/use-store-id";
import { type BrandItem } from "@/src/services/brands";
import { type ModelItem } from "@/src/services/models";
import {
  sortBrandsForPicker,
  useBrandsQuery,
  useCreateBrandMutation,
  useCreateModelMutation,
  useDeleteBrandMutation,
  useDeleteModelMutation,
  useModelsQuery,
  useUpdateBrandMutation,
  useUpdateModelMutation,
} from "@/src/queries/hooks";

export default function DevicePage() {
  const { storeId, loading: loadingStoreId } = useStoreId();

  const [activeTab, setActiveTab] = React.useState("devices");
  const [query, setQuery] = React.useState("");
  const [brandQuery, setBrandQuery] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const {
    data: items = [],
    isLoading: loadingModels,
    error: modelsError,
  } = useModelsQuery({
    storeId,
    searchTerm: query,
  });

  const {
    data: brandsData = [],
    isLoading: loadingBrands,
    error: brandsError,
  } = useBrandsQuery();
  const brands = React.useMemo(() => sortBrandsForPicker(brandsData), [brandsData]);
  const filteredBrands = React.useMemo(() => {
    const keyword = brandQuery.trim().toLowerCase();
    if (!keyword) return brands;
    return brands.filter((brand) => brand.name.toLowerCase().includes(keyword));
  }, [brands, brandQuery]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createName, setCreateName] = React.useState("");
  const [createBrandId, setCreateBrandId] = React.useState("");
  const [createImageFile, setCreateImageFile] = React.useState<File | null>(null);
  const [createError, setCreateError] = React.useState<string | null>(null);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editingModel, setEditingModel] = React.useState<ModelItem | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editBrandId, setEditBrandId] = React.useState("");
  const [editImageFile, setEditImageFile] = React.useState<File | null>(null);
  const [editError, setEditError] = React.useState<string | null>(null);

  const [createBrandOpen, setCreateBrandOpen] = React.useState(false);
  const [createBrandName, setCreateBrandName] = React.useState("");
  const [createBrandImageFile, setCreateBrandImageFile] = React.useState<File | null>(
    null,
  );
  const [createBrandError, setCreateBrandError] = React.useState<string | null>(null);

  const [editBrandOpen, setEditBrandOpen] = React.useState(false);
  const [editingBrand, setEditingBrand] = React.useState<BrandItem | null>(null);
  const [editBrandName, setEditBrandName] = React.useState("");
  const [editBrandImageFile, setEditBrandImageFile] = React.useState<File | null>(
    null,
  );
  const [editBrandError, setEditBrandError] = React.useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = React.useState<ModelItem | null>(null);
  const [deleteBrandTarget, setDeleteBrandTarget] = React.useState<BrandItem | null>(null);

  const createModelMutation = useCreateModelMutation();
  const updateModelMutation = useUpdateModelMutation();
  const deleteModelMutation = useDeleteModelMutation();

  const createBrandMutation = useCreateBrandMutation();
  const updateBrandMutation = useUpdateBrandMutation();
  const deleteBrandMutation = useDeleteBrandMutation();

  const createLoading = createModelMutation.isPending;
  const editLoading = updateModelMutation.isPending;
  const createBrandLoading = createBrandMutation.isPending;
  const editBrandLoading = updateBrandMutation.isPending;

  const deletingId =
    (deleteModelMutation.variables as { id?: string } | undefined)?.id ?? null;
  const deletingBrandId =
    (deleteBrandMutation.variables as { id?: string } | undefined)?.id ?? null;

  const isDevicesLoading = loadingStoreId || loadingModels || loadingBrands;
  const createImagePreview = React.useMemo(
    () => (createImageFile ? URL.createObjectURL(createImageFile) : null),
    [createImageFile],
  );
  const editImagePreview = React.useMemo(
    () => (editImageFile ? URL.createObjectURL(editImageFile) : null),
    [editImageFile],
  );
  const createBrandImagePreview = React.useMemo(
    () =>
      createBrandImageFile ? URL.createObjectURL(createBrandImageFile) : null,
    [createBrandImageFile],
  );
  const editBrandImagePreview = React.useMemo(
    () => (editBrandImageFile ? URL.createObjectURL(editBrandImageFile) : null),
    [editBrandImageFile],
  );

  React.useEffect(() => {
    return () => {
      if (createImagePreview) URL.revokeObjectURL(createImagePreview);
    };
  }, [createImagePreview]);

  React.useEffect(() => {
    return () => {
      if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    };
  }, [editImagePreview]);
  React.useEffect(() => {
    return () => {
      if (createBrandImagePreview) URL.revokeObjectURL(createBrandImagePreview);
    };
  }, [createBrandImagePreview]);
  React.useEffect(() => {
    return () => {
      if (editBrandImagePreview) URL.revokeObjectURL(editBrandImagePreview);
    };
  }, [editBrandImagePreview]);

  React.useEffect(() => {
    if (!modelsError) return;
    setError(modelsError instanceof Error ? modelsError.message : "Failed to load models");
  }, [modelsError]);

  React.useEffect(() => {
    if (!brandsError) return;
    setError(brandsError instanceof Error ? brandsError.message : "Failed to load brands");
  }, [brandsError]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!storeId) return;
    setCreateError(null);
    try {
      await createModelMutation.mutateAsync({
        storeId,
        name: createName,
        brandId: createBrandId,
        imageFile: createImageFile,
      });
      setCreateOpen(false);
      setCreateName("");
      setCreateBrandId("");
      setCreateImageFile(null);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create model");
    }
  };

  const openEdit = (item: ModelItem) => {
    setEditingModel(item);
    setEditName(item.name);
    setEditBrandId(item.brand_id ?? "");
    setEditImageFile(null);
    setEditError(null);
    setEditOpen(true);
  };

  const handleEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!storeId || !editingModel) return;
    setEditError(null);
    try {
      await updateModelMutation.mutateAsync({
        storeId,
        id: editingModel.id,
        name: editName,
        brandId: editBrandId,
        imageFile: editImageFile,
      });
      setEditOpen(false);
      setEditingModel(null);
      setEditName("");
      setEditBrandId("");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update model");
    }
  };

  const handleDelete = async (id: string) => {
    if (!storeId) return;
    try {
      await deleteModelMutation.mutateAsync({ storeId, id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete model");
    }
  };

  const handleCreateBrand = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateBrandError(null);
    try {
      await createBrandMutation.mutateAsync({
        name: createBrandName,
        logoFile: createBrandImageFile,
      });
      setCreateBrandOpen(false);
      setCreateBrandName("");
      setCreateBrandImageFile(null);
    } catch (err) {
      setCreateBrandError(err instanceof Error ? err.message : "Failed to create brand");
    }
  };

  const openEditBrand = (brand: BrandItem) => {
    setEditingBrand(brand);
    setEditBrandName(brand.name);
    setEditBrandImageFile(null);
    setEditBrandError(null);
    setEditBrandOpen(true);
  };

  const handleEditBrand = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingBrand) return;
    setEditBrandError(null);
    try {
      await updateBrandMutation.mutateAsync({
        id: editingBrand.id,
        name: editBrandName,
        logoFile: editBrandImageFile,
      });
      setEditBrandOpen(false);
      setEditingBrand(null);
      setEditBrandName("");
      setEditBrandImageFile(null);
    } catch (err) {
      setEditBrandError(err instanceof Error ? err.message : "Failed to update brand");
    }
  };

  const handleDeleteBrand = async (id: string) => {
    try {
      await deleteBrandMutation.mutateAsync({ id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete brand");
    }
  };

  return (
    <DashboardPageLayout
      header={{
        title: "Catalog Management",
        icon: AtomIcon,
      }}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="brands">Brands</TabsTrigger>
          </TabsList>
          {activeTab === "devices" ? (
            <Button
              type="button"
              size="lg"
              className="hover:cursor-pointer bg-primary text-lg rounded-sm text-primary-foreground hover:bg-primary/90"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-6" />
              Add Device
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              className="hover:cursor-pointer bg-primary text-lg rounded-sm text-primary-foreground hover:bg-primary/90"
              onClick={() => setCreateBrandOpen(true)}
            >
              <Plus className="size-6" />
              Add Brand
            </Button>
          )}
        </div>

        {!loadingStoreId && !storeId && (
          <div className="rounded-lg border border-border/60 bg-card px-4 py-10 text-center text-muted-foreground uppercase">
            Missing store ID in your account.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <TabsContent value="devices" className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search model name..."
                className="pl-9 bg-card border-border/60"
              />
            </div>
            <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-[0.12em]">
              {items.length} models
            </div>
          </div>

          {isDevicesLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={`model-skeleton-${index}`} className="rounded-xl bg-card p-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-16 w-16 rounded-lg shrink-0 bg-white/10" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-5 w-2/3 bg-white/10" />
                      <Skeleton className="h-4 w-1/2 bg-white/10" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-8 bg-white/10" />
                      <Skeleton className="h-8 w-8 bg-white/10" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-lg bg-card/40 px-4 py-10 text-center text-muted-foreground uppercase">
              No model found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-card p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex items-start gap-4">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-16 w-16 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-muted/20 grid place-items-center text-muted-foreground shrink-0">
                        <ImageIcon className="size-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="text-base md:text-lg font-semibold truncate">{item.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {item.brand_logo ? (
                          <img
                            src={item.brand_logo}
                            alt={item.brand_name ?? "Brand"}
                            className="h-4 w-4 rounded-sm object-cover"
                          />
                        ) : (
                          <div className="h-4 w-4 rounded-sm border border-border/60 bg-muted/20" />
                        )}
                        <span className="uppercase tracking-[0.08em]">
                          {item.brand_name ?? "Unknown brand"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground uppercase tracking-[0.12em]">
                        {new Date(item.created_at).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button type="button" size="icon-sm" variant="ghost" onClick={() => openEdit(item)}>
                        <SquarePen className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={deleteModelMutation.isPending && deletingId === item.id}
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="brands" className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={brandQuery}
                onChange={(event) => setBrandQuery(event.target.value)}
                placeholder="Search brand name..."
                className="pl-9 bg-card border-border/60"
              />
            </div>
            <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-[0.12em]">
              {filteredBrands.length} brands
            </div>
          </div>

          {loadingBrands ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`brand-skeleton-${index}`} className="rounded-xl bg-card p-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg shrink-0 bg-white/10" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-5 w-2/3 bg-white/10" />
                      <Skeleton className="h-4 w-1/2 bg-white/10" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="rounded-lg bg-card/40 px-4 py-10 text-center text-muted-foreground uppercase">
              No brand found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredBrands.map((brand) => (
                <div key={brand.id} className="rounded-xl bg-card p-4 transition-colors hover:bg-accent">
                  <div className="flex items-start gap-4">
                    {brand.logo ? (
                      <img
                        src={brand.logo}
                        alt={brand.name}
                        className="h-12 w-12 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted/20 grid place-items-center text-muted-foreground shrink-0">
                        <ImageIcon className="size-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="text-base md:text-lg font-semibold truncate">{brand.name}</h3>
                      <p className="text-xs text-muted-foreground uppercase tracking-[0.12em]">
                        {new Date(brand.created_at).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button type="button" size="icon-sm" variant="ghost" onClick={() => openEditBrand(brand)}>
                        <SquarePen className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={deleteBrandMutation.isPending && deletingBrandId === brand.id}
                        onClick={() => setDeleteBrandTarget(brand)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setCreateName("");
            setCreateBrandId("");
            setCreateImageFile(null);
            setCreateError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md border-none">
          <DialogHeader>
            <DialogTitle>Add Model</DialogTitle>
            <DialogDescription>Create a new model for this store.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-model-name">Model Name</Label>
              <Input
                id="create-model-name"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-model-brand">Brand</Label>
              <Select value={createBrandId} onValueChange={setCreateBrandId}>
                <SelectTrigger id="create-model-brand" className="w-full">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-model-image">Image</Label>
              <input
                id="create-model-image"
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={(event) => setCreateImageFile(event.target.files?.[0] ?? null)}
              />
              <label
                htmlFor="create-model-image"
                className="h-28 w-28 rounded-xl border border-dashed border-border/70 bg-card/60 hover:bg-card/90 transition-colors grid place-items-center cursor-pointer"
              >
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Plus className="size-5" />
                  <span className="text-xs uppercase tracking-[0.12em]">Image</span>
                </div>
              </label>
              <p className="text-xs text-muted-foreground">Supports PNG, JPG, JPEG, WEBP, GIF.</p>
              {createImageFile && (
                <p className="text-xs text-muted-foreground truncate">{createImageFile.name}</p>
              )}
              {createImagePreview && (
                <img
                  src={createImagePreview}
                  alt="New model preview"
                  className="h-16 w-16 rounded-md object-cover border border-border/60"
                />
              )}
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading || !createBrandId}>
                {createLoading ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditingModel(null);
            setEditName("");
            setEditBrandId("");
            setEditError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Model</DialogTitle>
            <DialogDescription>Update model.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-model-name">Model Name</Label>
              <Input
                id="edit-model-name"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-model-brand">Brand</Label>
              <Select value={editBrandId} onValueChange={setEditBrandId}>
                <SelectTrigger id="edit-model-brand" className="w-full">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-model-image">Image</Label>
              <input
                id="edit-model-image"
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={(event) => setEditImageFile(event.target.files?.[0] ?? null)}
              />
              <label
                htmlFor="edit-model-image"
                className="h-28 w-28 rounded-xl border border-dashed border-border/70 bg-card/60 hover:bg-card/90 transition-colors grid place-items-center cursor-pointer"
              >
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Plus className="size-5" />
                  <span className="text-xs uppercase tracking-[0.12em]">Image</span>
                </div>
              </label>
              <p className="text-xs text-muted-foreground">Supports PNG, JPG, JPEG, WEBP, GIF.</p>
              {editImageFile && (
                <p className="text-xs text-muted-foreground truncate">{editImageFile.name}</p>
              )}
              {editImagePreview ? (
                <img
                  src={editImagePreview}
                  alt="Updated model preview"
                  className="h-16 w-16 rounded-md object-cover border border-border/60"
                />
              ) : editingModel?.image ? (
                <img
                  src={editingModel.image}
                  alt={editingModel.name}
                  className="h-16 w-16 rounded-md object-cover border border-border/60"
                />
              ) : null}
              {!editImagePreview && !editingModel?.image && (
                <div className="h-16 w-16 rounded-md border border-border/60 bg-muted/20 grid place-items-center text-muted-foreground">
                  <ImageIcon className="size-4" />
                </div>
              )}
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading || !editBrandId}>
                {editLoading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createBrandOpen}
        onOpenChange={(open) => {
          setCreateBrandOpen(open);
          if (!open) {
            setCreateBrandName("");
            setCreateBrandImageFile(null);
            setCreateBrandError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md border-none">
          <DialogHeader>
            <DialogTitle>Add Brand</DialogTitle>
            <DialogDescription>Create a new brand.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBrand} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-brand-name">Brand Name</Label>
              <Input
                id="create-brand-name"
                value={createBrandName}
                onChange={(event) => setCreateBrandName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-brand-logo">Logo</Label>
              <input
                id="create-brand-logo"
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={(event) =>
                  setCreateBrandImageFile(event.target.files?.[0] ?? null)
                }
              />
              <label
                htmlFor="create-brand-logo"
                className="h-28 w-28 rounded-xl border border-dashed border-border/70 bg-card/60 hover:bg-card/90 transition-colors grid place-items-center cursor-pointer"
              >
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Plus className="size-5" />
                  <span className="text-xs uppercase tracking-[0.12em]">
                    Image
                  </span>
                </div>
              </label>
              <p className="text-xs text-muted-foreground">
                Supports PNG, JPG, JPEG, WEBP, GIF.
              </p>
              {createBrandImageFile && (
                <p className="text-xs text-muted-foreground truncate">
                  {createBrandImageFile.name}
                </p>
              )}
              {createBrandImagePreview && (
                <img
                  src={createBrandImagePreview}
                  alt="Brand logo preview"
                  className="h-16 w-16 rounded-md object-cover border border-border/60"
                />
              )}
            </div>
            {createBrandError && <p className="text-sm text-destructive">{createBrandError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateBrandOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBrandLoading}>
                {createBrandLoading ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editBrandOpen}
        onOpenChange={(open) => {
          setEditBrandOpen(open);
          if (!open) {
            setEditingBrand(null);
            setEditBrandName("");
            setEditBrandImageFile(null);
            setEditBrandError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md border-none">
          <DialogHeader>
            <DialogTitle>Edit Brand</DialogTitle>
            <DialogDescription>Update brand info.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditBrand} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-brand-name">Brand Name</Label>
              <Input
                id="edit-brand-name"
                value={editBrandName}
                onChange={(event) => setEditBrandName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-brand-logo">Logo</Label>
              <input
                id="edit-brand-logo"
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={(event) =>
                  setEditBrandImageFile(event.target.files?.[0] ?? null)
                }
              />
              <label
                htmlFor="edit-brand-logo"
                className="h-28 w-28 rounded-xl border border-dashed border-border/70 bg-card/60 hover:bg-card/90 transition-colors grid place-items-center cursor-pointer"
              >
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Plus className="size-5" />
                  <span className="text-xs uppercase tracking-[0.12em]">
                    Image
                  </span>
                </div>
              </label>
              <p className="text-xs text-muted-foreground">
                Supports PNG, JPG, JPEG, WEBP, GIF.
              </p>
              {editBrandImageFile && (
                <p className="text-xs text-muted-foreground truncate">
                  {editBrandImageFile.name}
                </p>
              )}
              {editBrandImagePreview ? (
                <img
                  src={editBrandImagePreview}
                  alt="Updated brand logo preview"
                  className="h-16 w-16 rounded-md object-cover border border-border/60"
                />
              ) : editingBrand?.logo ? (
                <img
                  src={editingBrand.logo}
                  alt={editingBrand.name}
                  className="h-16 w-16 rounded-md object-cover border border-border/60"
                />
              ) : (
                <div className="h-16 w-16 rounded-md border border-border/60 bg-muted/20 grid place-items-center text-muted-foreground">
                  <ImageIcon className="size-4" />
                </div>
              )}
            </div>
            {editBrandError && <p className="text-sm text-destructive">{editBrandError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditBrandOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editBrandLoading}>
                {editBrandLoading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={deleteTarget ? `Delete model "${deleteTarget.name}"?` : "Delete this model?"}
        confirmText="Delete"
        loading={Boolean(deleteTarget && deleteModelMutation.isPending && deletingId === deleteTarget.id)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await handleDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteBrandTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteBrandTarget(null);
        }}
        title={
          deleteBrandTarget
            ? `Delete brand "${deleteBrandTarget.name}"?`
            : "Delete this brand?"
        }
        confirmText="Delete"
        loading={Boolean(
          deleteBrandTarget &&
            deleteBrandMutation.isPending &&
            deletingBrandId === deleteBrandTarget.id,
        )}
        onConfirm={async () => {
          if (!deleteBrandTarget) return;
          await handleDeleteBrand(deleteBrandTarget.id);
          setDeleteBrandTarget(null);
        }}
      />
    </DashboardPageLayout>
  );
}
