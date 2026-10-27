import React, { useState } from "react";

import {
  Package,
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Search,
  Layers,
  DollarSign,
  Save,
  X,
  RefreshCw,
} from "lucide-react";

import type {
  Product,
  ProductCreate,
  ProductUpdate,
  CatalogStats,
} from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
} from "@/lib/api";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { toast } from "sonner";

export const InventoryManager: React.FC = () => {
  const queryClient = useQueryClient();

  // ============================================
  // FILTER / SEARCH STATE
  // ============================================

  const [selectedCategory, setSelectedCategory] =
    useState("all");

  const [searchQuery, setSearchQuery] =
    useState("");

  // ============================================
  // MODAL STATE
  // ============================================

  const [isAddModalOpen, setIsAddModalOpen] =
    useState(false);

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  // ============================================
  // NEW PRODUCT FORM
  // ============================================

  const [newProdName, setNewProdName] =
    useState("");

  const [newProdBrand, setNewProdBrand] =
    useState("");

  const [newProdCategory, setNewProdCategory] =
    useState("footwear");

  const [newProdPrice, setNewProdPrice] =
    useState("2499");

  const [newProdOrigPrice, setNewProdOrigPrice] =
    useState("3999");

  const [newProdStock, setNewProdStock] =
    useState("25");

  const [newProdSizes, setNewProdSizes] =
    useState("UK 7, UK 8, UK 9, UK 10");

  const [newProdColors, setNewProdColors] =
    useState("Black, Navy Blue");

  const [newProdImage, setNewProdImage] =
    useState(
      "https://images.unsplash.com/photo-1726133731483-d4b8bcabeb43?crop=entropy&cs=srgb&fm=jpg&q=85"
    );

  const [newProdDesc, setNewProdDesc] =
    useState("");

  const [newProdFeatures, setNewProdFeatures] =
    useState(
      "Breathable Mesh, Responsive EVA Foam, Anti-slip sole"
    );

  // ============================================
  // RESET ADD FORM
  // ============================================

  const resetNewForm = () => {
    setNewProdName("");
    setNewProdBrand("");
    setNewProdCategory("footwear");
    setNewProdPrice("2499");
    setNewProdOrigPrice("3999");
    setNewProdStock("25");
    setNewProdSizes(
      "UK 7, UK 8, UK 9, UK 10"
    );
    setNewProdColors(
      "Black, Navy Blue"
    );
    setNewProdImage(
      "https://images.unsplash.com/photo-1726133731483-d4b8bcabeb43?crop=entropy&cs=srgb&fm=jpg&q=85"
    );
    setNewProdDesc("");
    setNewProdFeatures(
      "Breathable Mesh, Responsive EVA Foam, Anti-slip sole"
    );
  };

  // ============================================
  // FETCH PRODUCTS
  // ============================================

  const {
    data: products = [],
    isLoading,
    refetch,
  } = useQuery<Product[]>({
    queryKey: [
      "merchant-products",
      selectedCategory,
      searchQuery,
    ],

    queryFn: () => {
      let url = "/catalog?";

      if (
        selectedCategory !== "all"
      ) {
        url += `category=${encodeURIComponent(
          selectedCategory
        )}&`;
      }

      if (searchQuery.trim()) {
        url += `search=${encodeURIComponent(
          searchQuery.trim()
        )}&`;
      }

      return apiGet<Product[]>(url);
    },
  });

  // ============================================
  // FETCH CATALOG STATS
  // ============================================

  const { data: stats } =
    useQuery<CatalogStats>({
      queryKey: ["catalog-stats"],

      queryFn: () =>
        apiGet<CatalogStats>(
          "/catalog/stats/summary"
        ),
    });

  // ============================================
  // CREATE PRODUCT
  // ============================================

  const createMutation = useMutation({
    mutationFn: (
      newProduct: ProductCreate
    ) =>
      apiPost<Product>(
        "/catalog",
        newProduct
      ),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["merchant-products"],
      });

      queryClient.invalidateQueries({
        queryKey: ["catalog-stats"],
      });

      setIsAddModalOpen(false);

      resetNewForm();

      toast.success(
        "Product successfully added to merchant catalog!"
      );
    },

    onError: (error) => {
      console.error(
        "Create product error:",
        error
      );

      toast.error(
        "Failed to create product"
      );
    },
  });

  // ============================================
  // UPDATE PRODUCT
  // ============================================

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: ProductUpdate;
    }) =>
      apiPut<Product>(
        `/catalog/${id}`,
        data
      ),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["merchant-products"],
      });

      queryClient.invalidateQueries({
        queryKey: ["catalog-stats"],
      });

      setEditingProduct(null);

      toast.success(
        "Product and stock updated!"
      );
    },

    onError: (error) => {
      console.error(
        "Update product error:",
        error
      );

      toast.error(
        "Failed to update product"
      );
    },
  });

  // ============================================
  // DELETE PRODUCT
  // ============================================

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiDelete(
        `/catalog/${id}`
      ),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["merchant-products"],
      });

      queryClient.invalidateQueries({
        queryKey: ["catalog-stats"],
      });

      toast.success(
        "Product deleted from catalog"
      );
    },

    onError: (error) => {
      console.error(
        "Delete product error:",
        error
      );

      toast.error(
        "Failed to delete product"
      );
    },
  });

  // ============================================
  // STOCK ADJUSTMENT
  // ============================================

  const handleStockAdjust = (
    product: Product,
    delta: number
  ) => {
    const newQuantity = Math.max(
      0,
      product.stock_quantity + delta
    );

    updateMutation.mutate({
      id: product.id,

      data: {
        stock_quantity: newQuantity,
        in_stock: newQuantity > 0,
      },
    });
  };

  // ============================================
  // CREATE PRODUCT SUBMIT
  // ============================================

  const handleCreateSubmit = (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (
      !newProdName.trim() ||
      !newProdBrand.trim() ||
      !newProdPrice
    ) {
      toast.error(
        "Please fill in required product fields"
      );

      return;
    }

    const price =
      Number.parseFloat(newProdPrice);

    const originalPrice =
      Number.parseFloat(
        newProdOrigPrice || newProdPrice
      );

    const stock =
      Number.parseInt(
        newProdStock || "0",
        10
      );

    if (
      Number.isNaN(price) ||
      price < 0
    ) {
      toast.error(
        "Please enter a valid price"
      );

      return;
    }

    if (
      Number.isNaN(originalPrice) ||
      originalPrice < 0
    ) {
      toast.error(
        "Please enter a valid MRP"
      );

      return;
    }

    if (
      Number.isNaN(stock) ||
      stock < 0
    ) {
      toast.error(
        "Please enter a valid stock quantity"
      );

      return;
    }

    const payload: ProductCreate = {
      name: newProdName.trim(),

      brand: newProdBrand.trim(),

      category: newProdCategory,

      price,

      original_price:
        originalPrice,

      stock_quantity: stock,

      sizes: newProdSizes
        .split(",")
        .map((size) =>
          size.trim()
        )
        .filter(Boolean),

      colors: newProdColors
        .split(",")
        .map((color) =>
          color.trim()
        )
        .filter(Boolean),

      image_url:
        newProdImage.trim(),

      description:
        newProdDesc.trim() ||
        `${newProdBrand} ${newProdName} built for performance and comfort.`,

      features: newProdFeatures
        .split(",")
        .map((feature) =>
          feature.trim()
        )
        .filter(Boolean),

      upsell_product_ids: [],

      is_featured: false,
    };

    createMutation.mutate(
      payload
    );
  };

  // ============================================
  // EDIT PRODUCT SUBMIT
  // ============================================

  const handleEditSubmit = (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!editingProduct) {
      return;
    }

    if (
      !editingProduct.name.trim()
    ) {
      toast.error(
        "Product name is required"
      );

      return;
    }

    if (
      editingProduct.price < 0
    ) {
      toast.error(
        "Price cannot be negative"
      );

      return;
    }

    if (
      editingProduct.stock_quantity <
      0
    ) {
      toast.error(
        "Stock cannot be negative"
      );

      return;
    }

    updateMutation.mutate({
      id: editingProduct.id,

      data: {
        name:
          editingProduct.name.trim(),

        brand:
          editingProduct.brand,

        category:
          editingProduct.category,

        price:
          editingProduct.price,

        original_price:
          editingProduct.original_price,

        stock_quantity:
          editingProduct.stock_quantity,

        in_stock:
          editingProduct.stock_quantity >
          0,

        description:
          editingProduct.description,
      },
    });
  };

  // ============================================
  // DELETE CONFIRMATION
  // ============================================

  const handleDelete = (
    product: Product
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${product.name}" from the merchant catalog?`
      );

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(
      product.id
    );
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ====================================== */}
      {/* HEADER */}
      {/* ====================================== */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2.5 font-heading text-2xl font-black text-white">
            <Package className="h-6 w-6 text-blue-500" />

            <span>
              Merchant Inventory & Catalog Hub
            </span>
          </h2>

          <p className="mt-1 text-xs text-zinc-400">
            Real-time warehouse stock
            synchronization for AI Agent
            instant queries
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            data-testid="refresh-catalog-btn"
            variant="outline"
            onClick={() =>
              refetch()
            }
            className="h-10 border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />

            Refresh
          </Button>

          <Button
            data-testid="add-product-btn"
            onClick={() =>
              setIsAddModalOpen(true)
            }
            className="h-10 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500"
          >
            <Plus className="mr-1.5 h-4 w-4" />

            Add New Product SKU
          </Button>
        </div>
      </div>

      {/* ====================================== */}
      {/* KPI CARDS */}
      {/* ====================================== */}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total SKUs */}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>
              Total SKUs
            </span>

            <Layers className="h-4 w-4 text-blue-400" />
          </div>

          <div
            data-testid="kpi-total-skus"
            className="mt-2 font-heading text-2xl font-black text-white"
          >
            {stats
              ? stats.total_skus
              : products.length}
          </div>

          <span className="text-[11px] font-medium text-emerald-400">
            Synced with AI Search
          </span>
        </div>

        {/* Inventory Value */}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>
              Inventory Value
            </span>

            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>

          <div
            data-testid="kpi-inventory-val"
            className="mt-2 font-heading text-2xl font-black text-white"
          >
            ₹
            {stats
              ? stats.total_inventory_value.toLocaleString(
                  "en-IN"
                )
              : "0"}
          </div>

          <span className="text-[11px] text-zinc-400">
            Warehouse Stock
          </span>
        </div>

        {/* In Stock */}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>
              In-Stock Items
            </span>

            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>

          <div
            data-testid="kpi-in-stock"
            className="mt-2 font-heading text-2xl font-black text-emerald-400"
          >
            {stats
              ? stats.in_stock_count
              : products.filter(
                  (product) =>
                    product.in_stock
                ).length}
          </div>

          <span className="text-[11px] text-zinc-400">
            Ready for instant order
          </span>
        </div>

        {/* Low Stock */}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>
              Low Stock Alerts
            </span>

            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>

          <div
            data-testid="kpi-low-stock"
            className="mt-2 font-heading text-2xl font-black text-amber-400"
          >
            {stats
              ? stats.low_stock_count
              : products.filter(
                  (product) =>
                    product.stock_quantity <=
                    5
                ).length}
          </div>

          <span className="text-[11px] text-amber-400/80">
            Threshold ≤ 5 units
          </span>
        </div>
      </div>

      {/* ====================================== */}
      {/* FILTER + SEARCH */}
      {/* ====================================== */}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-3.5">
        {/* Categories */}

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            "all",
            "footwear",
            "smartwatch",
            "electronics",
            "accessories",
          ].map((category) => (
            <button
              key={category}
              type="button"
              data-testid={`filter-cat-${category}`}
              onClick={() =>
                setSelectedCategory(
                  category
                )
              }
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                selectedCategory ===
                category
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Search */}

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />

          <Input
            data-testid="merchant-search-input"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(
                event.target.value
              )
            }
            placeholder="Search SKU, brand, name..."
            className="h-9 border-zinc-800 bg-zinc-950 pl-9 text-xs text-zinc-100"
          />
        </div>
      </div>

      {/* ====================================== */}
      {/* PRODUCT GRID */}
      {/* ====================================== */}

      {isLoading ? (
        <div className="py-16 text-center text-xs text-zinc-500">
          Loading merchant catalog...
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 py-16 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-zinc-600" />

          <h3 className="text-sm font-bold text-zinc-300">
            No products found
          </h3>

          <p className="mt-1 text-xs text-zinc-500">
            Try another category or search
            term.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map(
            (product) => (
              <div
                key={product.id}
                data-testid={`merchant-item-${product.id}`}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 transition-all hover:border-zinc-700"
              >
                {/* Product information */}

                <div className="flex gap-3">
                  <img
                    src={
                      product.image_url
                    }
                    alt={
                      product.name
                    }
                    className="h-20 w-20 shrink-0 rounded-xl border border-zinc-800 bg-zinc-950 object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-400">
                        {
                          product.brand
                        }
                      </span>

                      <span className="font-mono text-[10px] text-zinc-500">
                        {product.sku}
                      </span>
                    </div>

                    <h4 className="mt-1 truncate text-sm font-bold text-zinc-100">
                      {
                        product.name
                      }
                    </h4>

                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-heading text-base font-black text-white">
                        ₹
                        {product.price.toLocaleString(
                          "en-IN"
                        )}
                      </span>

                      {product.original_price >
                        product.price && (
                        <span className="text-xs text-zinc-500 line-through">
                          ₹
                          {product.original_price.toLocaleString(
                            "en-IN"
                          )}
                        </span>
                      )}
                    </div>

                    <div className="mt-1">
                      <span
                        className={`text-[10px] font-semibold ${
                          product.in_stock
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {product.in_stock
                          ? "IN STOCK"
                          : "OUT OF STOCK"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stock + Actions */}

                <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
                  {/* Stock */}

                  <div>
                    <span className="block text-[10px] font-semibold uppercase text-zinc-500">
                      Warehouse Stock
                    </span>

                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        data-testid={`stock-dec-${product.id}`}
                        onClick={() =>
                          handleStockAdjust(
                            product,
                            -1
                          )
                        }
                        disabled={
                          product.stock_quantity <=
                          0 ||
                          updateMutation.isPending
                        }
                        className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        -
                      </button>

                      <span
                        data-testid={`stock-qty-${product.id}`}
                        className="min-w-[24px] text-center font-mono text-sm font-bold text-zinc-100"
                      >
                        {
                          product.stock_quantity
                        }
                      </span>

                      <button
                        type="button"
                        data-testid={`stock-inc-${product.id}`}
                        onClick={() =>
                          handleStockAdjust(
                            product,
                            1
                          )
                        }
                        disabled={
                          updateMutation.isPending
                        }
                        className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Edit/Delete */}

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      data-testid={`edit-prod-btn-${product.id}`}
                      onClick={() =>
                        setEditingProduct(
                          product
                        )
                      }
                      className="rounded-lg bg-zinc-800 p-2 text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
                      title="Edit Product"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      data-testid={`del-prod-btn-${product.id}`}
                      onClick={() =>
                        handleDelete(
                          product
                        )
                      }
                      disabled={
                        deleteMutation.isPending
                      }
                      className="rounded-lg bg-zinc-800 p-2 text-zinc-300 transition-colors hover:bg-red-900/40 hover:text-red-300 disabled:opacity-40"
                      title="Delete Product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* ====================================== */}
      {/* ADD PRODUCT MODAL */}
      {/* ====================================== */}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-100 shadow-2xl">
            {/* Modal Header */}

            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Add New Product
                </h3>

                <p className="mt-0.5 text-[11px] text-zinc-500">
                  Create a new merchant
                  catalog SKU
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsAddModalOpen(
                    false
                  )
                }
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={
                handleCreateSubmit
              }
              className="space-y-3 text-xs"
            >
              {/* Name / Brand */}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>
                    Product Name *
                  </Label>

                  <Input
                    data-testid="add-name-input"
                    value={
                      newProdName
                    }
                    onChange={(event) =>
                      setNewProdName(
                        event.target
                          .value
                      )
                    }
                    placeholder="e.g. Velocity Nitro Pro"
                    className="mt-1 border-zinc-800 bg-zinc-900"
                    required
                  />
                </div>

                <div>
                  <Label>
                    Brand *
                  </Label>

                  <Input
                    data-testid="add-brand-input"
                    value={
                      newProdBrand
                    }
                    onChange={(event) =>
                      setNewProdBrand(
                        event.target
                          .value
                      )
                    }
                    placeholder="e.g. Puma, Nike"
                    className="mt-1 border-zinc-800 bg-zinc-900"
                    required
                  />
                </div>
              </div>

              {/* Category / Price / MRP */}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>
                    Category
                  </Label>

                  <select
                    data-testid="add-category-select"
                    value={
                      newProdCategory
                    }
                    onChange={(event) =>
                      setNewProdCategory(
                        event.target
                          .value
                      )
                    }
                    className="mt-1 h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-zinc-100"
                  >
                    <option value="footwear">
                      Footwear
                    </option>

                    <option value="smartwatch">
                      Smartwatch
                    </option>

                    <option value="electronics">
                      Electronics
                    </option>

                    <option value="accessories">
                      Accessories
                    </option>
                  </select>
                </div>

                <div>
                  <Label>
                    Price (₹) *
                  </Label>

                  <Input
                    data-testid="add-price-input"
                    type="number"
                    min="0"
                    value={
                      newProdPrice
                    }
                    onChange={(event) =>
                      setNewProdPrice(
                        event.target
                          .value
                      )
                    }
                    className="mt-1 border-zinc-800 bg-zinc-900 font-mono"
                    required
                  />
                </div>

                <div>
                  <Label>
                    MRP (₹)
                  </Label>

                  <Input
                    data-testid="add-mrp-input"
                    type="number"
                    min="0"
                    value={
                      newProdOrigPrice
                    }
                    onChange={(event) =>
                      setNewProdOrigPrice(
                        event.target
                          .value
                      )
                    }
                    className="mt-1 border-zinc-800 bg-zinc-900 font-mono"
                  />
                </div>
              </div>

              {/* Stock / Sizes */}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>
                    Initial Stock
                  </Label>

                  <Input
                    data-testid="add-stock-input"
                    type="number"
                    min="0"
                    value={
                      newProdStock
                    }
                    onChange={(event) =>
                      setNewProdStock(
                        event.target
                          .value
                      )
                    }
                    className="mt-1 border-zinc-800 bg-zinc-900 font-mono"
                  />
                </div>

                <div>
                  <Label>
                    Sizes
                  </Label>

                  <Input
                    data-testid="add-sizes-input"
                    value={
                      newProdSizes
                    }
                    onChange={(event) =>
                      setNewProdSizes(
                        event.target
                          .value
                      )
                    }
                    placeholder="UK 7, UK 8, UK 9"
                    className="mt-1 border-zinc-800 bg-zinc-900"
                  />
                </div>
              </div>

              {/* Colors */}

              <div>
                <Label>
                  Colors
                </Label>

                <Input
                  data-testid="add-colors-input"
                  value={
                    newProdColors
                  }
                  onChange={(event) =>
                    setNewProdColors(
                      event.target
                        .value
                    )
                  }
                  placeholder="Black, Navy Blue"
                  className="mt-1 border-zinc-800 bg-zinc-900"
                />
              </div>

              {/* Image */}

              <div>
                <Label>
                  Image URL
                </Label>

                <Input
                  data-testid="add-image-input"
                  value={
                    newProdImage
                  }
                  onChange={(event) =>
                    setNewProdImage(
                      event.target
                        .value
                    )
                  }
                  className="mt-1 border-zinc-800 bg-zinc-900"
                />
              </div>

              {/* Features */}

              <div>
                <Label>
                  Key Features
                </Label>

                <Input
                  data-testid="add-features-input"
                  value={
                    newProdFeatures
                  }
                  onChange={(event) =>
                    setNewProdFeatures(
                      event.target
                        .value
                    )
                  }
                  placeholder="Feature 1, Feature 2"
                  className="mt-1 border-zinc-800 bg-zinc-900"
                />
              </div>

              {/* Description */}

              <div>
                <Label>
                  Description
                </Label>

                <Textarea
                  data-testid="add-description-input"
                  value={
                    newProdDesc
                  }
                  onChange={(event) =>
                    setNewProdDesc(
                      event.target
                        .value
                    )
                  }
                  placeholder="Describe the product..."
                  className="mt-1 border-zinc-800 bg-zinc-900"
                />
              </div>

              {/* Actions */}

              <div className="flex justify-end gap-2 border-t border-zinc-800 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setIsAddModalOpen(
                      false
                    )
                  }
                  className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </Button>

                <Button
                  data-testid="submit-new-product-btn"
                  type="submit"
                  disabled={
                    createMutation.isPending
                  }
                  className="bg-blue-600 font-bold text-white hover:bg-blue-500"
                >
                  {createMutation.isPending
                    ? "Saving..."
                    : "Create SKU"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================== */}
      {/* EDIT PRODUCT MODAL */}
      {/* ====================================== */}

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-100 shadow-2xl">
            {/* Header */}

            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Edit Product & Stock
                </h3>

                <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
                  {editingProduct.sku}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditingProduct(
                    null
                  )
                }
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={
                handleEditSubmit
              }
              className="space-y-3 text-xs"
            >
              {/* Name */}

              <div>
                <Label>
                  Product Name
                </Label>

                <Input
                  data-testid="edit-name-input"
                  value={
                    editingProduct.name
                  }
                  onChange={(event) =>
                    setEditingProduct({
                      ...editingProduct,
                      name: event.target
                        .value,
                    })
                  }
                  className="mt-1 border-zinc-800 bg-zinc-900"
                />
              </div>

              {/* Brand / Category */}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>
                    Brand
                  </Label>

                  <Input
                    data-testid="edit-brand-input"
                    value={
                      editingProduct.brand
                    }
                    onChange={(event) =>
                      setEditingProduct({
                        ...editingProduct,
                        brand: event.target
                          .value,
                      })
                    }
                    className="mt-1 border-zinc-800 bg-zinc-900"
                  />
                </div>

                <div>
                  <Label>
                    Category
                  </Label>

                  <select
                    data-testid="edit-category-select"
                    value={
                      editingProduct.category
                    }
                    onChange={(event) =>
                      setEditingProduct({
                        ...editingProduct,
                        category:
                          event.target
                            .value,
                      })
                    }
                    className="mt-1 h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-zinc-100"
                  >
                    <option value="footwear">
                      Footwear
                    </option>

                    <option value="smartwatch">
                      Smartwatch
                    </option>

                    <option value="electronics">
                      Electronics
                    </option>

                    <option value="accessories">
                      Accessories
                    </option>
                  </select>
                </div>
              </div>

              {/* Price / MRP */}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>
                    Price (₹)
                  </Label>

                  <Input
                    data-testid="edit-price-input"
                    type="number"
                    min="0"
                    value={
                      editingProduct.price
                    }
                    onChange={(event) =>
                      setEditingProduct({
                        ...editingProduct,
                        price:
                          Number.parseFloat(
                            event.target
                              .value
                          ) || 0,
                      })
                    }
                    className="mt-1 border-zinc-800 bg-zinc-900 font-mono"
                  />
                </div>

                <div>
                  <Label>
                    MRP (₹)
                  </Label>

                  <Input
                    data-testid="edit-mrp-input"
                    type="number"
                    min="0"
                    value={
                      editingProduct.original_price
                    }
                    onChange={(event) =>
                      setEditingProduct({
                        ...editingProduct,
                        original_price:
                          Number.parseFloat(
                            event.target
                              .value
                          ) || 0,
                      })
                    }
                    className="mt-1 border-zinc-800 bg-zinc-900 font-mono"
                  />
                </div>
              </div>

              {/* Stock */}

              <div>
                <Label>
                  Stock Quantity
                </Label>

                <Input
                  data-testid="edit-stock-input"
                  type="number"
                  min="0"
                  value={
                    editingProduct.stock_quantity
                  }
                  onChange={(event) =>
                    setEditingProduct({
                      ...editingProduct,
                      stock_quantity:
                        Number.parseInt(
                          event.target
                            .value,
                          10
                        ) || 0,
                    })
                  }
                  className="mt-1 border-zinc-800 bg-zinc-900 font-mono"
                />
              </div>

              {/* Description */}

              <div>
                <Label>
                  Description
                </Label>

                <Textarea
                  data-testid="edit-desc-input"
                  value={
                    editingProduct.description
                  }
                  onChange={(event) =>
                    setEditingProduct({
                      ...editingProduct,
                      description:
                        event.target
                          .value,
                    })
                  }
                  className="mt-1 h-20 border-zinc-800 bg-zinc-900"
                />
              </div>

              {/* Actions */}

              <div className="flex justify-end gap-2 border-t border-zinc-800 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setEditingProduct(
                      null
                    )
                  }
                  className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </Button>

                <Button
                  data-testid="save-edit-product-btn"
                  type="submit"
                  disabled={
                    updateMutation.isPending
                  }
                  className="bg-blue-600 font-bold text-white hover:bg-blue-500"
                >
                  <Save className="mr-1.5 h-4 w-4" />

                  {updateMutation.isPending
                    ? "Saving..."
                    : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManager;