
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { RouteInfo, POI, Coordinate } from '../types';
import { DEFAULT_CENTER, ZOOM_LEVEL, ROUTE_COLORS, POI_COLORS } from '../constants';

// Fix for default Leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapComponentProps {
  routes: RouteInfo[];
  selectedRouteIndex: number;
  pois: POI[];
  userLocation: Coordinate | null;
  onRouteSelect: (index: number) => void;
  isFollowingUser?: boolean;
  onMapPan?: () => void;
  activeFilters: Set<string>;
  onToggleFilter: (type: string) => void;
  onHome?: () => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
  routes, 
  selectedRouteIndex, 
  pois, 
  userLocation,
  onRouteSelect,
  isFollowingUser = false,
  onMapPan,
  activeFilters,
  onToggleFilter,
  onHome
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const userLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const poisLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);

  // Map Initialization
  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('map-container', {
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: true,
        markerZoomAnimation: true
      }).setView(DEFAULT_CENTER, ZOOM_LEVEL);
      
      // Use a clean, modern map style
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map);
      
      L.control.zoom({ position: 'bottomleft' }).addTo(map);
      
      userLayerGroupRef.current = L.layerGroup().addTo(map);
      routesLayerGroupRef.current = L.layerGroup().addTo(map);
      poisLayerGroupRef.current = L.layerGroup().addTo(map);
      markersLayerGroupRef.current = L.layerGroup().addTo(map);

      map.on('dragstart', () => {
        if (onMapPan) onMapPan();
      });

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onMapPan]);

  // Handle User Location Updates
  useEffect(() => {
    const map = mapRef.current;
    const userLayer = userLayerGroupRef.current;
    if (!map || !userLayer) return;

    if (!userLocation) {
      if (userMarkerRef.current) userMarkerRef.current.remove();
      if (accuracyCircleRef.current) accuracyCircleRef.current.remove();
      userMarkerRef.current = null;
      accuracyCircleRef.current = null;
      return;
    }

    const { lat, lng, accuracy, heading, speed } = userLocation;
    const pos: L.LatLngExpression = [lat, lng];

    if (accuracy) {
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = L.circle(pos, {
          radius: accuracy,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 1,
          dashArray: '5, 5',
          interactive: false
        }).addTo(userLayer);
      } else {
        accuracyCircleRef.current.setLatLng(pos);
        accuracyCircleRef.current.setRadius(accuracy);
      }
    }

    const currentHeading = heading || 0;
    const markerHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute -inset-4 bg-blue-500 rounded-full animate-ping opacity-10"></div>
        <div class="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-2xl flex items-center justify-center z-10">
          <div class="w-2 h-2 bg-white rounded-full"></div>
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      className: 'gps-marker',
      html: markerHtml,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(pos, {
        zIndexOffset: 1000,
        icon: customIcon
      }).addTo(userLayer);
    } else {
      userMarkerRef.current.setLatLng(pos);
      userMarkerRef.current.setIcon(customIcon);
    }

    if (isFollowingUser) {
      map.setView(pos, map.getZoom(), { animate: true });
    }
  }, [userLocation, isFollowingUser]);

  // Handle Route, Start/End Markers and Safety Points (POIs)
  useEffect(() => {
    const map = mapRef.current;
    const routesLayer = routesLayerGroupRef.current;
    const poisLayer = poisLayerGroupRef.current;
    const markersLayer = markersLayerGroupRef.current;
    if (!map || !routesLayer || !poisLayer || !markersLayer) return;

    routesLayer.clearLayers();
    poisLayer.clearLayers();
    markersLayer.clearLayers();

    const selectedRoute = routes[selectedRouteIndex];
    if (!selectedRoute) return;

    // 1. Render all alternative routes
    routes.forEach((route, idx) => {
      const isSelected = idx === selectedRouteIndex;
      const color = isSelected ? ROUTE_COLORS[0] : '#cbd5e1';
      L.polyline(route.coordinates as any, { 
        color, 
        weight: isSelected ? 8 : 4, 
        opacity: isSelected ? 1 : 0.4,
        lineJoin: 'round', 
        interactive: true
      })
      .addTo(routesLayer)
      .on('click', () => onRouteSelect(idx));
    });

    // 2. Render Source (Start) Marker
    const startPos = selectedRoute.coordinates[0];
    L.marker(startPos as any, {
      zIndexOffset: 2000,
      icon: L.divIcon({
        className: 'start-marker-container',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute -inset-4 bg-emerald-400 rounded-full blur-xl opacity-40 animate-pulse"></div>
            <div class="w-10 h-10 rounded-2xl bg-emerald-600 border-2 border-white shadow-xl flex items-center justify-center text-white transform rotate-3">
              <i class="fa-solid fa-location-arrow text-sm"></i>
            </div>
            <div class="absolute -bottom-6 bg-emerald-600 text-[8px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap shadow-md">Start</div>
          </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      })
    }).addTo(markersLayer);

    // 3. Render Destination (End) Marker
    const endPos = selectedRoute.coordinates[selectedRoute.coordinates.length - 1];
    L.marker(endPos as any, {
      zIndexOffset: 2000,
      icon: L.divIcon({
        className: 'end-marker-container',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute -inset-4 bg-indigo-400 rounded-full blur-xl opacity-40 animate-pulse"></div>
            <div class="w-10 h-10 rounded-2xl bg-indigo-700 border-2 border-white shadow-xl flex items-center justify-center text-white transform -rotate-3">
              <i class="fa-solid fa-flag-checkered text-sm"></i>
            </div>
            <div class="absolute -bottom-6 bg-indigo-700 text-[8px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap shadow-md">Target</div>
          </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      })
    }).addTo(markersLayer);

    // 4. Render Points of Safety (POIs) along the route
    pois.forEach(poi => {
      const color = POI_COLORS[poi.type as keyof typeof POI_COLORS] || '#666';
      let icon = 'fa-circle-dot';
      let shouldPulse = false;
      
      switch(poi.type) {
        case 'police': 
          icon = 'fa-building-shield'; 
          shouldPulse = true;
          break;
        case 'hospital': 
          icon = 'fa-hand-holding-medical'; 
          shouldPulse = true;
          break;
        case 'crowded_place': 
          icon = 'fa-users'; 
          break;
        case 'street_light': 
          icon = 'fa-lightbulb'; 
          break;
      }

      L.marker([poi.lat, poi.lng], {
        zIndexOffset: shouldPulse ? 1500 : 1200,
        icon: L.divIcon({
          className: 'safety-poi-marker',
          html: `
            <div class="relative group cursor-pointer">
              ${shouldPulse ? `<div class="absolute -inset-2 bg-white rounded-full animate-ping opacity-20"></div>` : ''}
              <div class="absolute -inset-1 bg-white/50 rounded-full blur-sm"></div>
              <div class="w-9 h-9 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white relative z-10 transition-all group-hover:scale-125 group-hover:shadow-2xl" style="background-color: ${color}">
                <i class="fa-solid ${icon} text-[13px]"></i>
              </div>
              <div class="absolute left-1/2 -translate-x-1/2 -top-8 bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase tracking-widest shadow-xl border border-white/20">
                ${poi.name || poi.type.replace('_', ' ')}
              </div>
            </div>`,
          iconSize: [36, 36], 
          iconAnchor: [18, 18]
        })
      }).addTo(poisLayer).bindPopup(`
        <div class="p-2 min-w-[120px]">
          <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">${poi.type.replace('_', ' ')}</p>
          <p class="font-black text-slate-800 text-sm leading-tight">${poi.name || 'Safety Facility'}</p>
        </div>
      `);
    });

    // Automatically zoom to show the whole safety corridor
    if (!isFollowingUser) {
      const group = L.featureGroup([...routesLayer.getLayers() as any, ...markersLayer.getLayers() as any]);
      const bounds = group.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [80, 80], animate: true });
      }
    }
  }, [routes, selectedRouteIndex, pois, onRouteSelect, isFollowingUser]);

  const filterOptions = [
    { id: 'police', label: 'Police Stations', icon: 'fa-building-shield', color: 'text-red-500' },
    { id: 'hospital', label: 'Medical Points', icon: 'fa-hand-holding-medical', color: 'text-pink-500' },
    { id: 'crowded_place', label: 'Crowded Hubs', icon: 'fa-users', color: 'text-blue-500' },
    { id: 'street_light', label: 'Street Lights', icon: 'fa-lightbulb', color: 'text-yellow-500' },
  ];

  return (
    <div className="h-full w-full relative">
      <div id="map-container" className="h-full w-full bg-slate-100 shadow-inner"></div>
      
      {/* Home Button (Top Right) */}
      {onHome && (
        <div className="absolute top-6 right-6 z-[1000]">
          <button
            onClick={onHome}
            className="w-14 h-14 bg-white rounded-[1.25rem] shadow-[0_10px_30px_rgba(0,0,0,0.1)] flex items-center justify-center text-indigo-600 transition-all hover:scale-110 active:scale-95 border border-white/50 group"
            title="Return to Search"
          >
            <i className="fa-solid fa-house text-xl group-hover:animate-bounce"></i>
            <span className="sr-only">Home</span>
          </button>
        </div>
      )}

      {/* Visual Safety Dashboard (Top Left) */}
      <div className="absolute top-6 left-6 z-[1000] hidden lg:block">
        <div className="bg-white/90 backdrop-blur-2xl p-5 rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.12)] border border-white/60 space-y-4 w-52 overflow-hidden">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
             <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs">
               <i className="fa-solid fa-shield-halved"></i>
             </div>
             <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-800">Safety Layers</h4>
          </div>
          <div className="space-y-1.5">
            {filterOptions.map(opt => {
              const isActive = activeFilters.has(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => onToggleFilter(opt.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl transition-all group ${
                    isActive ? 'bg-slate-900 text-white shadow-lg' : 'bg-transparent text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <i className={`fa-solid ${opt.icon} text-[11px] ${isActive ? 'text-white' : opt.color}`}></i>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                      {opt.id.split('_')[0]}
                    </span>
                  </div>
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                    isActive ? 'border-indigo-400 bg-indigo-400' : 'border-slate-200'
                  }`}>
                    {isActive && <i className="fa-solid fa-check text-[7px] text-slate-900"></i>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SOS Quick Button Overlay (Bottom Right) */}
      <div className="absolute bottom-10 right-10 z-[1000] lg:hidden">
        {/* Mobile FAB already in App.tsx */}
      </div>
    </div>
  );
};

export default MapComponent;
