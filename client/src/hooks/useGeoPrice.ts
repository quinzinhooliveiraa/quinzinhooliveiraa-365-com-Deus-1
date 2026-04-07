import { useQuery } from "@tanstack/react-query";

export interface GeoPrice {
  currency: string;
  symbol: string;
  monthly: number;
  yearly: number;
  yearlyMonthly: number;
  monthlyFormatted: string;
  yearlyFormatted: string;
  yearlyMonthlyFormatted: string;
  countryCode: string;
}

const DEFAULT: GeoPrice = {
  currency: "BRL",
  symbol: "R$",
  monthly: 9.9,
  yearly: 79.9,
  yearlyMonthly: 6.66,
  monthlyFormatted: "R$9,90",
  yearlyFormatted: "R$79,90",
  yearlyMonthlyFormatted: "R$6,66",
  countryCode: "BR",
};

export function useGeoPrice(): { price: GeoPrice; loading: boolean } {
  const { data, isLoading } = useQuery<GeoPrice>({
    queryKey: ["/api/geo-pricing"],
    staleTime: 1000 * 60 * 60,
    retry: 1,
  });

  return { price: data ?? DEFAULT, loading: isLoading };
}
