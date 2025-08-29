"use client";
import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface Address {
  address: string;
  street: string;
  city: string;
  postalCode: string;
  fullAddress: string;
  score: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: Address) => void;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Začněte psát adresu...",
  className = ""
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchAddresses = async () => {
      if (value.length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/addresses/search?q=${encodeURIComponent(value)}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const addresses = Array.isArray(data.addresses) ? data.addresses : [];
        console.log('AddressAutocomplete: results', { query: value, count: addresses.length, sample: addresses[0] });
        setSuggestions(addresses);
        setShowSuggestions(addresses.length > 0);

        if (addresses.length === 0 && value.length >= 3) {
          setError('Žádné adresy nenalezeny. Zkuste jiný výraz.');
        } else {
          setError(null);
        }
      } catch (error) {
        console.error('Address search failed:', error);
        setSuggestions([]);
        setShowSuggestions(false);
        setError(error instanceof Error ? error.message : 'Chyba při vyhledávání adres');
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(searchAddresses, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [value]);

  const handleAddressSelect = (address: Address) => {
    onChange(address.fullAddress);
    onAddressSelect(address);
    setShowSuggestions(false);
    setError(null);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-4 py-3 border border-gray-300 text-sm focus:border-black focus:outline-none rounded-none ${className}`}
          autoComplete="off"
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {(showSuggestions || (error && !showSuggestions)) && (
        <div className="absolute z-50 w-full bg-white border border-gray-300 shadow-lg max-h-60 overflow-y-auto mt-1">
          {error && suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100">
              {error}
            </div>
          ) : (
            suggestions.map((address, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleAddressSelect(address)}
                className="w-full px-4 py-3 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0 text-gray-900"
              >
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {address.fullAddress || `${address.street}${address.city ? `, ${address.city}` : ''}${address.postalCode ? ` ${address.postalCode}` : ''}`}
                </div>
                <div className="text-xs text-gray-600 flex items-center gap-2">
                  <span>{address.street}</span>
                  {address.city && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span>{address.city}</span>
                    </>
                  )}
                  {address.postalCode && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span>{address.postalCode}</span>
                    </>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}