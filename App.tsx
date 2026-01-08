
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword
} from 'firebase/auth'; // Corrected import path for firebase/auth
import { auth } from "./auth";
import MapComponent from './components/MapComponent';
import RouteSearch from './components/RouteSearch';
import GeminiAssistant from './components/GeminiAssistant';
import { RouteInfo, POI, Coordinate, HistoryItem, UserProfile } from './types';
import { geocode, fetchRoutes } from './services/mapService';
import { saveRouteHistory, getRouteHistory, triggerSOS, logoutUser } from './services/firebaseService';
import { getSafetyAdvice } from './services/geminiService';
import { sendSOS_SMS } from './services/smsService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [pois, setPois] = useState<POI[]>([]);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [advice, setAdvice] = useState<string | null>(null);
  const [sosStatus, setSosStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [isJourneyActive, setIsJourneyActive] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | 'unsupported'>('prompt');
  
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(['police', 'hospital', 'crowded_place', 'street_light']));
  
  const [profile, setProfile] = useState<UserProfile>({ 
    name: '', 
    userPhone: '', 
    emergencyNumber: '', 
    isPermissionGranted: false, 
    hasOnboarded: false 
  });

  const [initialSource, setInitialSource] = useState('');
  const [initialDest, setInitialDest] = useState('');

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      if (auth.currentUser?.uid) {
        localStorage.setItem(`safety_profile_${auth.currentUser.uid}`, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  // Monitor Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const saved = localStorage.getItem(`safety_profile_${firebaseUser.uid}`);
        if (saved) {
          setProfile(JSON.parse(saved));
        } else {
          setProfile({ 
            name: firebaseUser.displayName || '', 
            userPhone: '', 
            emergencyNumber: '', 
            isPermissionGranted: false, 
            hasOnboarded: false 
          });
        }
        setUser(firebaseUser);
        setError("");
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setShowResults(false);
  };

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPermissionStatus('granted');
        updateProfile({ isPermissionGranted: true });
      },
      () => setPermissionStatus('denied'),
      { enableHighAccuracy: true }
    );
  }, [updateProfile]);

  useEffect(() => {
    if (user && profile.hasOnboarded) {
      requestLocation();
      getRouteHistory().then(setHistory);
    }
  }, [user, profile.hasOnboarded, requestLocation]);

  const handleSearch = useCallback(async (from: string, to: string) => {
    setIsLoading(true);
    setAdvice(null);
    try {
      const startCoord = await geocode(from || 'Current Location');
      const endCoord = await geocode(to);
      if (!startCoord || !endCoord) {
        alert("Location not found. Please try again.");
        return;
      }

      const fetchedRoutes = await fetchRoutes(startCoord, endCoord);
      if (fetchedRoutes.length === 0) return;

      setRoutes(fetchedRoutes);
      setSelectedRouteIndex(0);
      setInitialSource(from || 'Current Location');
      setInitialDest(to);
      setPois(fetchedRoutes[0].pois);
      setShowResults(true);

      saveRouteHistory({
        source: from || 'Current Location',
        destination: to,
        safetyScore: fetchedRoutes[0].safetyScore,
        timestamp: Date.now()
      });
      getSafetyAdvice(`${from} to ${to}`).then(setAdvice);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSOS = async () => {
    if (sosStatus !== 'idle') return;
    setSosStatus('sending');
    try {
      await triggerSOS(userLocation?.lat || 0, userLocation?.lng || 0);
      await sendSOS_SMS(profile.emergencyNumber, userLocation?.lat, userLocation?.lng);
      setSosStatus('sent');
      setTimeout(() => setSosStatus('idle'), 5000);
    } catch (err) {
      setSosStatus('idle');
    }
  };

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Verifying Protocol...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-200/30 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-100/40 rounded-full blur-[100px]"></div>

        <div className="max-w-md w-full bg-white/80 backdrop-blur-2xl p-10 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] relative z-10 border border-white">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-200 transform -rotate-3">
               <i className="fa-solid fa-shield-heart text-4xl text-white"></i>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-tight">Guardian<br/>Travel</h1>
            <p className="text-slate-400 text-sm font-semibold tracking-wide mt-2">SECURE YOUR JOURNEY TODAY</p>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Identity Verification</h2>
            
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <input
                type="email"
                placeholder="Email Address"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
                className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold text-sm text-black"
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
                className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold text-sm text-black"
              />
              {error && (
                <div className="text-[11px] font-bold text-red-500 bg-red-50 p-4 rounded-xl border border-red-100 leading-normal animate-fadeIn">
                  <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                  {error}
                </div>
              )}
              <button
                type="submit"
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all disabled:opacity-50"
              >
                {isRegistering ? "Create Account" : "Sign In"}
              </button>
            </form>
          </div>

          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="w-full mt-8 text-[11px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
          >
            {isRegistering ? "Already a guardian? Login" : "Join the protector network"}
          </button>
        </div>
      </div>
    );
  }

  if (!profile.hasOnboarded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-[4rem] shadow-2xl p-12 text-center border border-indigo-50">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Complete Profile</h2>
            <p className="text-slate-500 font-medium text-sm mt-1">Configure your safety net</p>
          </div>
          <div className="space-y-6 text-left">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Guardian Name</label>
              <input 
                type="text" 
                placeholder="Your Full Name" 
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-black"
                value={profile.name}
                onChange={(e) => updateProfile({ name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Emergency Contact</label>
              <input 
                type="tel" 
                placeholder="Mobile Number" 
                className="w-full px-6 py-4 bg-red-50/20 border border-red-100 rounded-2xl text-sm font-bold text-black"
                value={profile.emergencyNumber}
                onChange={(e) => updateProfile({ emergencyNumber: e.target.value })}
              />
            </div>
            <button 
              onClick={() => updateProfile({ hasOnboarded: true })} 
              className="w-full py-5 rounded-[2rem] bg-indigo-600 text-white font-black uppercase tracking-widest shadow-xl"
            >
              Start Protection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-white">
      {!showResults ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 relative">
          <nav className="absolute top-0 w-full p-8 flex justify-between items-center">
            <h1 className="font-black text-2xl tracking-tighter text-indigo-900 uppercase">Guardian Hub</h1>
            <button onClick={handleLogout} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-red-500">Sign Out</button>
          </nav>
          <div className="w-full max-w-xl animate-fadeIn">
            <div className="mb-12 text-center">
              <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none mb-4 uppercase">Secure your <br/><span className="text-indigo-600">Travel Path</span></h2>
              <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Active Guardian: {profile.name}</p>
            </div>
            <RouteSearch onSearch={handleSearch} isLoading={isLoading} />
          </div>
        </div>
      ) : (
        <>
          <aside className="hidden lg:flex flex-col w-[28rem] bg-white border-r border-slate-200 overflow-y-auto p-6 space-y-6">
            <button onClick={() => setShowResults(false)} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-full w-fit">
              <i className="fa-solid fa-arrow-left mr-2"></i>New Route
            </button>
            
            {advice && (
              <div className="bg-indigo-600 text-white rounded-[2rem] p-6 shadow-xl animate-fadeIn">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">AI Safety Protocol</p>
                <p className="text-sm font-bold leading-relaxed italic">"{advice}"</p>
              </div>
            )}

            <div className="bg-slate-900 text-white rounded-[2.5rem] p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Security Score</span>
                <span className="text-2xl font-black">{routes[selectedRouteIndex]?.safetyScore}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${routes[selectedRouteIndex]?.safetyScore}%` }}></div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Alternative Paths</h3>
              {routes.map((route, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setSelectedRouteIndex(idx)}
                  className={`w-full p-5 rounded-3xl border-2 text-left transition-all ${selectedRouteIndex === idx ? 'border-indigo-600 bg-indigo-50' : 'border-slate-50 hover:border-slate-200'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-black text-lg text-black">{(route.duration / 60).toFixed(0)} MINS</span>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full text-white ${route.safetyScore > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}>{route.safetyScore}% SAFE</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <main className="flex-1 relative">
            <MapComponent 
              routes={routes} 
              selectedRouteIndex={selectedRouteIndex} 
              pois={pois.filter(p => activeFilters.has(p.type))} 
              userLocation={userLocation} 
              onRouteSelect={setSelectedRouteIndex}
              isFollowingUser={isFollowingUser}
              onMapPan={() => setIsFollowingUser(false)}
              activeFilters={activeFilters}
              onToggleFilter={(type) => setActiveFilters(prev => {
                const next = new Set(prev);
                if (next.has(type)) next.delete(type); else next.add(type);
                return next;
              })}
            />
            
            <div className="absolute bottom-10 left-10 right-10 lg:left-auto z-[1000] flex justify-center space-x-4">
               <button 
                onClick={handleSOS} 
                className={`w-24 h-24 rounded-full bg-red-600 text-white shadow-2xl flex flex-col items-center justify-center border-4 border-white transition-transform active:scale-90 ${sosStatus === 'sending' ? 'animate-pulse' : ''}`}
               >
                 <i className="fa-solid fa-bell text-2xl mb-1"></i>
                 <span className="text-[10px] font-black uppercase">SOS</span>
               </button>
            </div>

            <GeminiAssistant profile={profile} activeRoute={routes[selectedRouteIndex]} source={initialSource} destination={initialDest} />
          </main>
        </>
      )}
    </div>
  );
};

export default App;
