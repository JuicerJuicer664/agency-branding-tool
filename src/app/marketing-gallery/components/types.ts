export interface GalleryItem {
  id: number;
  address: string;
  city: string;
  state: string;
  beds: number;
  baths: number;
  sqft: number;
  price: string;
  propertyType: 'residential' | 'luxury' | 'commercial' | 'condo';
  listingType: 'New Listing' | 'Open House' | 'Just Sold' | 'Price Reduced';
  imageUrl: string;
  imageAlt: string;
  createdAt: string;
  downloadCount: number;
  shareCount: number;
  template: string;
}

export interface FilterState {
  search: string;
  propertyType: string;
  sortBy: string;
  dateRange: string;
}