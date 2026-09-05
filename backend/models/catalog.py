from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid


class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    brand: str
    category: str  # "footwear", "smartwatch", "electronics", "accessories", ...
    price: float = Field(..., ge=0)  # in INR
    original_price: float = Field(..., ge=0)
    discount_percent: int = Field(default=0, ge=0, le=100)
    rating: float = Field(default=4.5, ge=0, le=5)
    reviews_count: int = Field(default=120, ge=0)
    in_stock: bool = True
    stock_quantity: int = Field(default=25, ge=0)
    sizes: List[str] = Field(default_factory=list)
    colors: List[str] = Field(default_factory=list)
    image_url: str
    description: str
    features: List[str] = Field(default_factory=list)
    upsell_product_ids: List[str] = Field(default_factory=list)
    is_featured: bool = False
    sku: str = Field(default_factory=lambda: f"SKU-{uuid.uuid4().hex[:6].upper()}")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProductCreate(BaseModel):
    name: str
    brand: str
    category: str
    price: float = Field(..., ge=0)
    original_price: float = Field(..., ge=0)
    rating: float = Field(default=4.5, ge=0, le=5)
    stock_quantity: int = Field(default=20, ge=0)
    sizes: List[str] = Field(default_factory=list)
    colors: List[str] = Field(default_factory=list)
    image_url: str
    description: str
    features: List[str] = Field(default_factory=list)
    upsell_product_ids: List[str] = Field(default_factory=list)
    is_featured: bool = False


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = Field(default=None, ge=0)
    original_price: Optional[float] = Field(default=None, ge=0)
    stock_quantity: Optional[int] = Field(default=None, ge=0)
    in_stock: Optional[bool] = None
    sizes: Optional[List[str]] = None
    colors: Optional[List[str]] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    features: Optional[List[str]] = None
    upsell_product_ids: Optional[List[str]] = None
    is_featured: Optional[bool] = None