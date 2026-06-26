import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface CountryProfile {
  countryCode: string;
  displayName: string;
  biasModel: string;
  enabledFeatures: string[];
  dataSources: {
    scraperIds: string[];
    languages: string[];
  };
}

interface CountryContextType {
  countryCode: string;
  setCountryCode: (code: string) => void;
}

const CountryContext = createContext<CountryContextType>({
  countryCode: 'GLOBAL',
  setCountryCode: () => {},
});

export function CountryProfileProvider({ children }: { children: ReactNode }) {
  const [countryCode, setCountryCode] = useState<string>('GLOBAL');

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedCountryCode');
    if (saved) {
      setCountryCode(saved);
    }
  }, []);

  const handleSetCountry = (code: string) => {
    setCountryCode(code);
    localStorage.setItem('selectedCountryCode', code);
  };

  return (
    <CountryContext.Provider value={{ countryCode, setCountryCode: handleSetCountry }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountryProfile() {
  const { countryCode, setCountryCode } = useContext(CountryContext);

  const { data: profile, isLoading } = useQuery<CountryProfile>({
    queryKey: ['country-profile', countryCode],
    queryFn: async () => {
      const res = await fetch(`/api/country-profile?code=${countryCode}`);
      if (!res.ok) throw new Error('Failed to fetch country profile');
      return res.json();
    },
    staleTime: 3600000, // 1 hour
  });

  return {
    profile,
    isLoading,
    countryCode,
    setCountryCode,
    enabledFeatures: profile?.enabledFeatures || [],
    biasModel: profile?.biasModel || 'SPECTRUM',
  };
}
