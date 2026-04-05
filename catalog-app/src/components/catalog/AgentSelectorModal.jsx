import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, UserCheck, Phone, Check } from 'lucide-react';

const AgentSelectorModal = ({ isOpen, onClose, agents, onSelect, activeAgentId }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.phone?.includes(searchTerm)
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-2xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 50 }}
            className="relative max-w-2xl w-full max-h-[85vh] bg-white rounded-[40px] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-2xl md:text-3xl font-[900] text-slate-900 leading-tight">בחר סוכן מכירות</h2>
                <p className="text-slate-500 font-medium">בחר את הסוכן שאליו תרצה לשלוח את ההזמנה</p>
              </div>
              <button 
                onClick={onClose}
                className="w-12 h-12 bg-slate-50 hover:bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Search */}
            <div className="p-6 md:p-8 pb-4">
              <div className="relative group">
                <div className="absolute inset-y-0 right-4 flex items-center text-slate-400 group-focus-within:text-primary-500 transition-colors">
                  <Search size={20} />
                </div>
                <input 
                  type="text" 
                  placeholder="חפש לפי שם או טלפון..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pr-12 pl-4 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 transition-all outline-none font-bold"
                />
              </div>
            </div>

            {/* Agents List */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-0 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => {
                      onSelect(agent);
                      onClose();
                    }}
                    className={`group relative flex items-center gap-4 p-4 rounded-3xl border-2 transition-all duration-300 ${
                      activeAgentId === agent.id 
                        ? 'bg-primary-50 border-primary-500 shadow-md scale-[1.02]' 
                        : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-lg'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200 shadow-inner group-hover:scale-110 transition-transform">
                      {agent.image ? (
                        <img src={agent.image} alt={agent.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <UserCheck size={24} />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 text-right">
                      <p className="font-black text-slate-900 leading-none mb-1">{agent.name}</p>
                      <p className="text-slate-400 text-sm font-bold flex items-center gap-1 justify-end">
                        {agent.phone}
                        <Phone size={12} />
                      </p>
                    </div>

                    {activeAgentId === agent.id && (
                      <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg">
                        <Check size={16} strokeWidth={4} />
                      </div>
                    )}
                  </button>
                ))}

                {filteredAgents.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400">
                    <p className="text-lg font-bold">לא נמצאו סוכנים העונים לחיפוש</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 text-center">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Groopy Catalog Agent System</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AgentSelectorModal;
