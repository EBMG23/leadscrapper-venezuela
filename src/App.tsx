/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Search, 
  Download, 
  MapPin, 
  Phone, 
  Star, 
  MessageSquare, 
  ExternalLink, 
  Loader2,
  Plus,
  Building2,
  ChevronRight
} from 'lucide-react';
import Papa from 'papaparse';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Lead {
  name: string;
  rating: string;
  reviews: string;
  address: string;
  phone: string;
  url: string;
}

export default function App() {
  const [businessType, setBusinessType] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => console.log("Geolocation permission denied")
      );
    }
  }, []);

  const parseLeadsFromText = (text: string): Lead[] => {
    const lines = text.split('\n');
    const extractedLeads: Lead[] = [];
    let currentLead: Partial<Lead> = {};
    
    lines.forEach(line => {
      const cleanLine = line.trim();
      // Match patterns like "- Nombre: Name", "**Nombre:** Name", "Nombre: Name"
      const matchKey = (key: string) => {
        const regex = new RegExp(`(?:^[-*\\s]*|\\*\\*)${key}:?\\*?\\*?\\s*(.*)`, 'i');
        const match = cleanLine.match(regex);
        return match ? match[1].trim() : null;
      };

      const name = matchKey('Nombre');
      if (name) {
        if (currentLead.name) extractedLeads.push(currentLead as Lead);
        currentLead = { name };
      } else {
        const rating = matchKey('Calificación');
        if (rating) currentLead.rating = rating;
        
        const reviews = matchKey('Reseñas');
        if (reviews) currentLead.reviews = reviews;
        
        const address = matchKey('Dirección');
        if (address) currentLead.address = address;
        
        const phone = matchKey('Teléfono');
        if (phone) currentLead.phone = phone;
        
        const url = matchKey('URL');
        if (url) currentLead.url = url;
      }
    });
    
    if (currentLead.name) extractedLeads.push(currentLead as Lead);
    return extractedLeads;
  };

  const handleSearch = async (isMore = false) => {
    if (!businessType || !location) {
      setError("Por favor ingresa el tipo de negocio y la ubicación.");
      return;
    }

    setLoading(true);
    setError(null);
    if (!isMore) setLeads([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const prompt = `Actúa como un experto en extracción de datos. 
      Busca ${isMore ? 'más ' : ''}negocios del tipo "${businessType}" en "${location}, Venezuela".
      
      IMPORTANTE: Solo devuelve negocios que estén REALMENTE en Venezuela.
      
      Para cada negocio, proporciona la siguiente información en este formato exacto de lista para que pueda procesarlo:
      - Nombre: [Nombre del negocio]
      - Calificación: [Estrellas o N/A]
      - Reseñas: [Número de reseñas o N/A]
      - Dirección: [Dirección completa]
      - Teléfono: [Número de teléfono o N/A]
      - URL: [URL de Google Maps]
      
      Trae al menos 15-20 resultados detallados.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: userCoords ? {
                latitude: userCoords.lat,
                longitude: userCoords.lng
              } : undefined
            }
          }
        },
      });

      const text = response.text || '';
      const newLeads = parseLeadsFromText(text);
      
      if (newLeads.length === 0) {
        setError("No se encontraron resultados para esta búsqueda en Venezuela.");
      } else {
        setLeads(prev => isMore ? [...prev, ...newLeads] : newLeads);
      }
    } catch (err: any) {
      console.error(err);
      setError("Error al conectar con el servicio de búsqueda. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const csv = Papa.unparse(leads);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_${businessType}_${location}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#1a0b2e] text-white font-['Poppins'] selection:bg-purple-500/30">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
          body { font-family: 'Poppins', sans-serif; }
        `}
      </style>

      {/* Hero Section */}
      <header className="pt-12 pb-8 px-6 max-w-6xl mx-auto text-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium mb-6"
        >
          <Building2 size={16} />
          <span>LeadScrapper Venezuela v2.0</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-6xl font-bold mb-6 tracking-tight bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent"
        >
          Encuentra Leads Comerciales <br className="hidden md:block" /> en Venezuela
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-purple-200/60 text-lg max-w-2xl mx-auto mb-10"
        >
          Automatiza tu prospección de ventas extrayendo datos precisos de Google Maps. 
          Diseñado específicamente para el mercado venezolano.
        </motion.p>

        {/* Search Box */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="max-w-4xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-2"
        >
          <div className="flex-1 flex items-center px-4 gap-3 border-b md:border-b-0 md:border-r border-white/10 py-3">
            <Search className="text-purple-400" size={20} />
            <input 
              type="text" 
              placeholder="¿Qué buscas? (Ej: Dentistas)"
              className="bg-transparent border-none outline-none w-full text-white placeholder:text-white/30"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
            />
          </div>
          <div className="flex-1 flex items-center px-4 gap-3 py-3">
            <MapPin className="text-purple-400" size={20} />
            <input 
              type="text" 
              placeholder="¿Dónde? (Ej: Chacao, Caracas)"
              className="bg-transparent border-none outline-none w-full text-white placeholder:text-white/30"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <button 
            onClick={() => handleSearch(false)}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white font-semibold px-8 py-3 rounded-xl transition-all flex items-center justify-center gap-2 group"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            <span>{loading ? 'Buscando...' : 'Extraer Leads'}</span>
          </button>
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pb-24">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8 text-center"
            >
              {error}
            </motion.div>
          )}

          {leads.length > 0 ? (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  Resultados Encontrados
                  <span className="text-sm font-normal bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-md">
                    {leads.length} leads
                  </span>
                </h2>
                <button 
                  onClick={downloadCSV}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  <Download size={18} />
                  Descargar CSV
                </button>
              </div>

              {/* Table / Grid */}
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="px-6 py-4 text-sm font-semibold text-purple-300">Negocio</th>
                      <th className="px-6 py-4 text-sm font-semibold text-purple-300">Calificación</th>
                      <th className="px-6 py-4 text-sm font-semibold text-purple-300">Contacto</th>
                      <th className="px-6 py-4 text-sm font-semibold text-purple-300">Dirección</th>
                      <th className="px-6 py-4 text-sm font-semibold text-purple-300">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {leads.map((lead, idx) => (
                      <motion.tr 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.05, 1) }}
                        key={idx} 
                        className="hover:bg-white/5 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                            {lead.name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 text-yellow-500">
                              <Star size={14} fill="currentColor" />
                              <span className="text-sm font-medium text-white">{lead.rating}</span>
                            </div>
                            <div className="flex items-center gap-1 text-purple-400/60">
                              <MessageSquare size={14} />
                              <span className="text-xs">{lead.reviews}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-white/80">
                            <Phone size={14} className="text-purple-400" />
                            {lead.phone}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2 text-sm text-white/60 max-w-xs truncate">
                            <MapPin size={14} className="text-purple-400 shrink-0 mt-0.5" />
                            {lead.address}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <a 
                            href={lead.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            Ver Mapa
                            <ExternalLink size={12} />
                          </a>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Load More Button */}
              <div className="flex justify-center pt-8">
                <button 
                  onClick={() => handleSearch(true)}
                  disabled={loading}
                  className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 px-8 py-3 rounded-xl transition-all text-purple-300 font-semibold disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                  Extraer Más Leads
                </button>
              </div>
            </motion.div>
          ) : !loading && (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mb-6 border border-purple-500/20">
                <Search size={32} className="text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Comienza tu búsqueda</h3>
              <p className="text-white/40 max-w-sm">
                Ingresa un tipo de negocio y una zona de Venezuela para empezar a extraer leads comerciales.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-xl">
            <Building2 />
            LeadScrapper
          </div>
          <div className="text-white/40 text-sm">
            © 2026 LeadScrapper Venezuela. Herramienta de automatización ética.
          </div>
          <div className="flex gap-6 text-sm text-white/60">
            <a href="#" className="hover:text-white transition-colors">Términos</a>
            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
            <a href="#" className="hover:text-white transition-colors">Soporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
