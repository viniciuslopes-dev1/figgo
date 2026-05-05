export type TradePoint = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  facadeImageUrl?: string;
  description?: string;
  availableDays: string[];
  openingTime: string;
  closingTime: string;
  createdBy: string;
  createdAt: string;
};
