
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { RouteInfo, UserProfile } from '../types';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface GeminiAssistantProps {
  profile: UserProfile;
  activeRoute?: RouteInfo;
  source: string;
  destination: string;
}

const GeminiAssistant: React.FC<GeminiAssistantProps> = ({ profile, activeRoute, source, destination }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: `Hello ${profile.name}! I'm your AI Safety Guardian. I'm monitoring your journey from ${source} to ${destination}. How can I assist you right now?` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<Chat | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const initChat = () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const safetyScore = activeRoute?.safetyScore || 'N/A';
    
    chatRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `You are a "Guardian Angel" safety assistant for a woman traveler named ${profile.name}. 
        Current Journey: From ${source} to ${destination}. 
        Current Route Safety Score: ${safetyScore}%. 
        Your tone: Reassuring, alert, protective, and concise. 
        Your goal: Provide practical safety tips, help her stay calm if she feels unsafe, identify nearby safe spots (police, hospitals) based on the context, and keep her company conversationally. 
        Always remind her that her emergency contact (${profile.emergencyNumber}) is just a button press away if things get serious.`,
      },
    });
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    if (!chatRef.current) initChat();

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const response: GenerateContentResponse = await chatRef.current!.sendMessage({ message: userMsg });
      const text = response.text || "I'm here for you. Stay in well-lit areas.";
      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (error) {
      console.error("Gemini Assistant Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "I'm having a bit of trouble connecting, but remember to stay alert and keep your phone ready." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-32 right-10 z-[2000] flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[350px] max-h-[500px] bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.2)] border border-indigo-100 overflow-hidden flex flex-col animate-bounceIn origin-bottom-right">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-pink-500 p-5 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <i className="fa-solid fa-wand-magic-sparkles text-lg"></i>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-70 leading-none mb-1">Safety Assistant</p>
                <p className="text-sm font-black leading-none">Guardian AI</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full hover:bg-white/10 transition-colors">
              <i className="fa-solid fa-times"></i>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[300px] max-h-[350px] scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm font-medium leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-lg' 
                    : 'bg-slate-100 text-slate-800 rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-100 p-4 rounded-[1.5rem] rounded-bl-none flex space-x-1 items-center">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Ask anything..."
              className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-black"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button 
              type="submit"
              disabled={isTyping}
              className="w-11 h-11 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 transition-all active:scale-90 disabled:opacity-50"
            >
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full shadow-[0_15px_40px_rgba(79,70,229,0.4)] flex items-center justify-center text-white transition-all transform hover:scale-110 active:scale-90 relative overflow-hidden group ${
          isOpen ? 'bg-slate-800' : 'bg-gradient-to-tr from-indigo-600 to-pink-500'
        }`}
      >
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        {isOpen ? (
          <i className="fa-solid fa-comment-slash text-xl"></i>
        ) : (
          <div className="relative">
            <i className="fa-solid fa-wand-magic-sparkles text-2xl"></i>
            {!isOpen && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>}
          </div>
        )}
      </button>
    </div>
  );
};

export default GeminiAssistant;
