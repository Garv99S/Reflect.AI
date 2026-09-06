import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Search,
  Navigation,
  Check,
  X,
  ExternalLink,
  Sparkles,
  Compass,
  Building,
  TreePine,
  Coffee,
  Globe,
  Loader2,
  Trash2,
} from 'lucide-react';
import type { EntryLocation } from '../types';
import {
  geocodeAddress,
  reverseGeocode,
  searchPlaces,
  getCurrentBrowserLocation,
  SANCTUARY_LOCATION_PRESETS,
  LocationSearchResult,
  getGoogleMapsUrl,
} from '../lib/mapsApi';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation?: EntryLocation;
  onSelectLocation: (location: EntryLocation | undefined) => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected Pin in the Modal
  const [selectedPin, setSelectedPin] = useState<EntryLocation | undefined>(currentLocation);

  // Synchronize when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPin(currentLocation);
      setSearchQuery('');
      setSearchResults([]);
      setErrorMsg(null);
    }
  }, [isOpen, currentLocation]);

  if (!isOpen) return null;

  // Search places / addresses
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setErrorMsg(null);
    try {
      const results = await searchPlaces(searchQuery);
      if (results.length === 0) {
        // Fallback to direct geocoding
        const geoRes = await geocodeAddress(searchQuery);
        if (geoRes) {
          setSearchResults([geoRes]);
        } else {
          setErrorMsg('No matching places or addresses found. Try a different search query or select a preset.');
          setSearchResults([]);
        }
      } else {
        setSearchResults(results);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      setErrorMsg(msg);
    } finally {
      setIsSearching(false);
    }
  };

  // Acquire current GPS position
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setErrorMsg(null);
    try {
      const coords = await getCurrentBrowserLocation();
      const revData = await reverseGeocode(coords.lat, coords.lng);
      if (revData) {
        setSelectedPin({
          lat: revData.lat,
          lng: revData.lng,
          placeName: revData.placeName || 'Current Location',
          formattedAddress: revData.formattedAddress,
          placeId: revData.placeId,
          pinnedAt: new Date().toISOString(),
        });
      } else {
        setSelectedPin({
          lat: coords.lat,
          lng: coords.lng,
          placeName: 'My Current Coordinates',
          formattedAddress: `Lat: ${coords.lat.toFixed(4)}, Lng: ${coords.lng.toFixed(4)}`,
          pinnedAt: new Date().toISOString(),
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not detect device location';
      setErrorMsg(msg);
    } finally {
      setIsLocating(false);
    }
  };

  // Pick from search result or preset
  const handlePickResult = (result: LocationSearchResult) => {
    setSelectedPin({
      lat: result.lat,
      lng: result.lng,
      placeName: result.placeName,
      formattedAddress: result.formattedAddress,
      placeId: result.placeId,
      vicinity: result.vicinity,
      pinnedAt: new Date().toISOString(),
    });
    setSearchResults([]);
  };

  // Confirm and save location to journal entry
  const handleConfirmPin = () => {
    onSelectLocation(selectedPin);
    onClose();
  };

  // Remove pinned location
  const handleRemovePin = () => {
    onSelectLocation(undefined);
    onClose();
  };

  return (
    <div
      id="location-picker-modal-backdrop"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="location-picker-modal-dialog"
        className="bg-[#0D0D0D] border border-[#D4AF37]/30 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-serif font-medium text-white flex items-center gap-2">
                <span>Pin Location to Reflection</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#EED484] border border-[#D4AF37]/40">
                  Google Maps Platform
                </span>
              </h2>
              <p className="text-xs text-white/50">
                Ground your journal reflections in geographic context with zero-trust owner isolation.
              </p>
            </div>
          </div>
          <button
            id="close-location-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="space-y-2">
            <label className="text-xs font-mono uppercase text-white/60 flex items-center justify-between">
              <span>Search Place or Address</span>
              <span className="text-[10px] text-[#D4AF37]/80">Geocoded & Proxied Server-Side</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="place-search-input"
                  type="text"
                  placeholder="e.g. Muir Woods, Central Park, Kyoto, or full street address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                />
              </div>
              <button
                id="search-places-btn"
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-4 py-2.5 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#EED484] border border-[#D4AF37]/40 rounded-xl text-xs font-mono uppercase font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Search</span>
              </button>
            </div>
          </form>

          {/* Action Row: Use Current Location */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <Compass className="w-4 h-4 text-[#D4AF37]" />
              <span>Acquire real-time GPS coordinates via device sensor:</span>
            </div>
            <button
              id="use-current-location-btn"
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
              <span>{isLocating ? 'Detecting GPS...' : 'Use My Current Location'}</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Search Results Dropdown / Panel */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-mono uppercase text-white/50 flex items-center justify-between">
                <span>Matching Places ({searchResults.length})</span>
                <span className="text-white/30">Click to Select</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                {searchResults.map((res, idx) => (
                  <button
                    key={`${res.placeId || res.formattedAddress}-${idx}`}
                    type="button"
                    onClick={() => handlePickResult(res)}
                    className="w-full p-2.5 rounded-xl bg-white/5 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/40 border border-white/5 text-left transition-all flex items-start gap-2.5 group cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs text-white group-hover:text-[#EED484] truncate">
                        {res.placeName}
                      </div>
                      <div className="text-[11px] text-white/50 truncate">{res.formattedAddress}</div>
                      <div className="text-[9px] font-mono text-white/30 mt-0.5">
                        Lat: {res.lat.toFixed(4)}, Lng: {res.lng.toFixed(4)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sanctuary & Nature Presets */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase text-white/50 flex items-center gap-1.5">
              <TreePine className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Sanctuary & Mindful Reflection Presets</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SANCTUARY_LOCATION_PRESETS.map((preset) => {
                const isSelected =
                  selectedPin?.lat === preset.lat && selectedPin?.lng === preset.lng;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() =>
                      handlePickResult({
                        lat: preset.lat,
                        lng: preset.lng,
                        placeName: preset.name,
                        formattedAddress: preset.formattedAddress,
                      })
                    }
                    className={`p-2.5 rounded-xl text-left border transition-all flex items-start justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20 text-white/80'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white flex items-center gap-1.5">
                        <span>{preset.name}</span>
                      </div>
                      <div className="text-[10px] text-white/40 truncate">{preset.formattedAddress}</div>
                      <div className="text-[9px] font-mono text-[#D4AF37]/70 mt-0.5">{preset.category}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Pin Preview & Map Visualizer */}
          {selectedPin ? (
            <div
              id="active-pin-preview-box"
              className="p-4 rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/30 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 animate-bounce" />
                  </div>
                  <div>
                    <div className="text-sm font-serif font-medium text-white">{selectedPin.placeName}</div>
                    <div className="text-xs text-white/60">{selectedPin.formattedAddress}</div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-[#D4AF37]">
                      <span>LAT: {selectedPin.lat.toFixed(5)}</span>
                      <span>LNG: {selectedPin.lng.toFixed(5)}</span>
                    </div>
                  </div>
                </div>

                <a
                  href={getGoogleMapsUrl(selectedPin)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-[10px] font-mono flex items-center gap-1 transition-colors shrink-0"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Interactive Stylized Coordinates Radar Canvas */}
              <div className="relative w-full h-28 rounded-lg bg-black/60 border border-white/10 overflow-hidden flex items-center justify-center">
                {/* Radar Grid Lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:16px_16px]" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-20 h-20 rounded-full border border-[#D4AF37]/20 animate-ping opacity-25" />
                  <div className="w-12 h-12 rounded-full border border-[#D4AF37]/40" />
                </div>
                {/* Center Pin Marker */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-[#D4AF37] border-2 border-black shadow-[0_0_15px_#D4AF37]" />
                  <span className="text-[10px] font-mono font-bold text-[#EED484] bg-black/80 px-2 py-0.5 rounded border border-[#D4AF37]/40 mt-1">
                    {selectedPin.placeName}
                  </span>
                </div>
                {/* Top left overlay badge */}
                <div className="absolute top-2 left-2 text-[9px] font-mono text-white/40 bg-black/80 px-1.5 py-0.5 rounded border border-white/5">
                  GEODATA ENCRYPTED
                </div>
                <div className="absolute bottom-2 right-2 text-[9px] font-mono text-[#D4AF37]/80 bg-black/80 px-1.5 py-0.5 rounded border border-[#D4AF37]/20">
                  {selectedPin.lat > 0 ? `${selectedPin.lat.toFixed(2)}°N` : `${Math.abs(selectedPin.lat).toFixed(2)}°S`},{' '}
                  {selectedPin.lng > 0 ? `${selectedPin.lng.toFixed(2)}°E` : `${Math.abs(selectedPin.lng).toFixed(2)}°W`}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center rounded-xl bg-white/[0.02] border border-white/10 text-white/40 text-xs space-y-1">
              <Globe className="w-6 h-6 mx-auto text-white/20 mb-1" />
              <p>No location currently selected for this journal entry.</p>
              <p className="text-[10px] text-white/30 font-mono">
                Search above or tap "Use My Current Location" to pin coordinates.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/[0.02]">
          <div>
            {currentLocation && (
              <button
                id="remove-location-pin-btn"
                type="button"
                onClick={handleRemovePin}
                className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Location Pin</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              id="cancel-location-modal-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 text-xs font-mono uppercase transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-location-pin-btn"
              type="button"
              onClick={handleConfirmPin}
              disabled={!selectedPin}
              className="px-5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#EED484] text-black text-xs font-sans font-medium uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Pin to Entry</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
