import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Megaphone } from 'lucide-react';

const PromotionPopup = ({ isOpen, onClose, promotion }) => {
    if (!promotion) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
                    />
                    
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-200">
                                    <Megaphone size={20} className="md:w-6 md:h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                                        {promotion.title}
                                    </h2>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 md:p-8 overflow-y-auto thin-scrollbar relative">
                            <div 
                                className="prose prose-sm md:prose-base max-w-none text-slate-800 font-bold leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: promotion.content }}
                            />
                        </div>

                        {/* Footer / Action */}
                        <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/50">
                            <button 
                                onClick={onClose}
                                className="w-full py-4 px-6 bg-slate-900 text-white font-black rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                            >
                                הבנתי, תודה!
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PromotionPopup;
