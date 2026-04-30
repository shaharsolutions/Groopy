import React, { useState, useEffect } from 'react';
import { X, Save, Megaphone, MousePointer2, Layout, Type, Percent, Banknote, Target } from 'lucide-react';

const PromotionFormModal = ({ 
    isOpen, 
    onClose, 
    onSave, 
    promotion, 
    setPromotion, 
    isUpdating, 
    isEdit = false 
}) => {
    const [editMode, setEditMode] = useState('simple'); // 'simple' or 'html'
    const [selectedTemplate, setSelectedTemplate] = useState('primary');

    const templates = {
        primary: {
            name: 'סטנדרטי',
            html: (text) => `<div style="background: #f8fafc; border-right: 4px solid #6366f1; padding: 20px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"><p style="margin: 0; color: #1e293b; font-weight: 800; font-size: 16px; line-height: 1.6;">${text}</p></div>`
        },
        gold: {
            name: 'זהב יוקרתי',
            html: (text) => `<div style="background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%); border: 2px solid #facc15; padding: 24px; border-radius: 24px; position: relative; overflow: hidden;"><div style="position: absolute; top: 0; right: 0; width: 100%; height: 4px; background: #eab308;"></div><p style="margin: 0; color: #854d0e; font-weight: 900; font-size: 18px; line-height: 1.5; text-shadow: 0 1px 0 rgba(255,255,255,0.5);">${text}</p></div>`
        },
        accent: {
            name: 'מודרני צבעוני',
            html: (text) => `<div style="background: #e0f2fe; border: 2px dashed #0ea5e9; padding: 20px; border-radius: 20px;"><p style="margin: 0; color: #0369a1; font-weight: 800; font-size: 16px; letter-spacing: -0.01em;">${text}</p></div>`
        },
        minimal: {
            name: 'מינימליסטי',
            html: (text) => `<div style="padding: 12px 0;"><p style="margin: 0; color: #475569; font-weight: 700; font-size: 15px; border-right: 3px solid #cbd5e1; padding-right: 16px;">${text}</p></div>`
        }
    };

    // Initialize local state from promotion when opening
    useEffect(() => {
        if (isOpen) {
            if (isEdit) {
                // If we have a message, use it. 
                // If not, try to extract text from content (for old promotions)
                if (!promotion.message && promotion.content) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = promotion.content;
                    const extractedText = tempDiv.textContent || tempDiv.innerText || '';
                    
                    if (extractedText) {
                        setPromotion(prev => ({ ...prev, message: extractedText }));
                        setEditMode('simple');
                    } else {
                        setEditMode('html');
                    }
                } else if (promotion.message) {
                    setEditMode('simple');
                } else {
                    setEditMode('html');
                }
            } else {
                setEditMode('simple');
                if (!promotion.message) {
                    setPromotion(prev => ({ ...prev, message: '' }));
                }
            }
        }
    }, [isOpen, isEdit]);

    // Update content when message or template changes in simple mode
    useEffect(() => {
        if (editMode !== 'simple') return;

        const currentMessage = promotion.message || '';
        const template = templates[selectedTemplate] || templates.primary;
        const generatedHtml = template.html(currentMessage.replace(/\n/g, '<br/>'));
        
        if (generatedHtml !== promotion.content) {
            setPromotion(prev => ({ ...prev, content: generatedHtml }));
        }
    }, [promotion.message, selectedTemplate, editMode]); // Removed promotion.content from deps to stabilize array size

    if (!isOpen) return null;

    const triggers = [
        { id: 'cart_drawer', label: 'תמיד בסל הקניות', description: 'המודעה תופיע בראש רשימת הפריטים בסל' },
        { id: 'popup_on_load', label: 'פופ-אפ בכניסה', description: 'מודעה קופצת ברגע שהלקוח נכנס לקטלוג' },
        { id: 'popup_on_add', label: 'פופ-אפ בהוספה לסל', description: 'מודעה קופצת כשהלקוח מוסיף פריט ראשון לסל' }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
            
            <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-200">
                            <Megaphone size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                {isEdit ? 'עריכת מבצע' : 'הוספת מבצע חדש'}
                            </h2>
                            <p className="text-slate-500 text-sm font-bold">הגדרת תוכן שיווקי שיוצג ללקוחות</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all">
                        <X size={24} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-8 overflow-y-auto thin-scrollbar space-y-8">
                    {/* Promotion Title */}
                    <div className="space-y-3">
                        <label className="text-sm font-black text-slate-700 mr-2 uppercase tracking-widest">כותרת המבצע</label>
                        <input 
                            type="text"
                            value={promotion.title || ''}
                            onChange={(e) => setPromotion({ ...promotion, title: e.target.value })}
                            placeholder="לדוגמה: מבצע סוף עונה!"
                            className="w-full bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl p-4 text-slate-900 font-bold transition-all outline-none"
                        />
                    </div>

                    {/* Discount Configuration */}
                    <div className="space-y-6 p-6 bg-primary-50/50 rounded-[32px] border border-primary-100">
                        <label className="text-sm font-black text-primary-900 uppercase tracking-widest flex items-center gap-2">
                            <Percent size={16} />
                            הגדרת הנחה אוטומטית
                        </label>
                        
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { id: 'none', label: 'ללא הנחה', icon: X },
                                { id: 'percentage', label: 'אחוז הנחה', icon: Percent },
                                { id: 'fixed', label: 'סכום קבוע', icon: Banknote }
                            ].map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => setPromotion({ ...promotion, discount_type: type.id })}
                                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-2 ${
                                        (promotion.discount_type || 'none') === type.id 
                                        ? 'border-primary-500 bg-white text-primary-600 shadow-sm' 
                                        : 'border-transparent bg-white/50 text-slate-400 hover:bg-white'
                                    }`}
                                >
                                    <type.icon size={20} />
                                    <span className="text-xs font-black">{type.label}</span>
                                </button>
                            ))}
                        </div>

                        {promotion.discount_type !== 'none' && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <Target size={12} />
                                        ערך ההנחה ({promotion.discount_type === 'percentage' ? '%' : '₪'})
                                    </label>
                                    <input 
                                        type="number"
                                        value={promotion.discount_value || ''}
                                        onChange={(e) => setPromotion({ ...promotion, discount_value: parseFloat(e.target.value) || 0 })}
                                        placeholder="0"
                                        className="w-full bg-white border-2 border-transparent focus:border-primary-500 rounded-xl p-3 text-slate-900 font-bold transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <Banknote size={12} />
                                        מינימום הזמנה
                                    </label>
                                    <input 
                                        type="number"
                                        value={promotion.min_order_value || ''}
                                        onChange={(e) => setPromotion({ ...promotion, min_order_value: parseFloat(e.target.value) || 0 })}
                                        placeholder="0"
                                        className="w-full bg-white border-2 border-transparent focus:border-primary-500 rounded-xl p-3 text-slate-900 font-bold transition-all outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Display Trigger Selector */}
                    <div className="space-y-4">
                        <label className="text-sm font-black text-slate-700 mr-2 uppercase tracking-widest flex items-center gap-2">
                            <MousePointer2 size={16} />
                            מתי להציג את המודעה?
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                            {triggers.map((trigger) => (
                                <button
                                    key={trigger.id}
                                    onClick={() => setPromotion({ ...promotion, display_trigger: trigger.id })}
                                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-right ${
                                        (promotion.display_trigger || 'cart_drawer') === trigger.id 
                                        ? 'border-primary-500 bg-primary-50/50' 
                                        : 'border-slate-100 bg-white hover:border-slate-200'
                                    }`}
                                >
                                    <div>
                                        <p className="font-black text-slate-900">{trigger.label}</p>
                                        <p className="text-xs text-slate-500 font-bold">{trigger.description}</p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                        (promotion.display_trigger || 'cart_drawer') === trigger.id 
                                        ? 'border-primary-500 bg-primary-500' 
                                        : 'border-slate-200'
                                    }`}>
                                        {(promotion.display_trigger || 'cart_drawer') === trigger.id && (
                                            <div className="w-2 h-2 bg-white rounded-full" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Design Selection */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-black text-slate-700 mr-2 uppercase tracking-widest flex items-center gap-2">
                                <Layout size={16} />
                                עיצוב המודעה
                            </label>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button 
                                    onClick={() => setEditMode('simple')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${editMode === 'simple' ? 'bg-white text-primary-500 shadow-sm' : 'text-slate-400'}`}
                                >
                                    פשוט
                                </button>
                                <button 
                                    onClick={() => setEditMode('html')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${editMode === 'html' ? 'bg-white text-primary-500 shadow-sm' : 'text-slate-400'}`}
                                >
                                    מתקדם (HTML)
                                </button>
                            </div>
                        </div>

                        {editMode === 'simple' ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(templates).map(([id, template]) => (
                                        <button
                                            key={id}
                                            onClick={() => setSelectedTemplate(id)}
                                            className={`p-4 rounded-2xl border-2 transition-all text-center ${
                                                selectedTemplate === id 
                                                ? 'border-primary-500 bg-primary-50/50' 
                                                : 'border-slate-100 bg-white hover:border-slate-200'
                                            }`}
                                        >
                                            <p className={`text-sm font-black ${selectedTemplate === id ? 'text-primary-600' : 'text-slate-600'}`}>
                                                {template.name}
                                            </p>
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 mr-2 uppercase tracking-widest flex items-center gap-2">
                                        <Type size={12} />
                                        טקסט המודעה
                                    </label>
                                    <textarea 
                                        value={promotion.message || ''}
                                        onChange={(e) => setPromotion({ ...promotion, message: e.target.value })}
                                        placeholder="הכנס את תוכן המודעה כאן..."
                                        rows={4}
                                        className="w-full bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl p-4 text-slate-900 font-bold transition-all outline-none resize-none"
                                    />
                                </div>

                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">תצוגה מקדימה</p>
                                    <div 
                                        className="promotion-preview"
                                        dangerouslySetInnerHTML={{ __html: promotion.content }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="text-[10px] text-slate-400 font-bold mb-2">ניתן להשתמש בתגיות HTML לעיצוב המודעה (div, img, span, b וכו')</div>
                                <textarea 
                                    value={promotion.content || ''}
                                    onChange={(e) => setPromotion({ ...promotion, content: e.target.value })}
                                    placeholder="<div style='background: gold; padding: 10px; border-radius: 8px;'>...</div>"
                                    rows={8}
                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl p-4 text-slate-900 font-mono text-sm transition-all outline-none resize-none"
                                />
                            </div>
                        )}
                    </div>

                    {/* Status Toggle */}
                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full ${promotion.is_active ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                            <div>
                                <p className="font-black text-slate-900">סטטוס מבצע</p>
                                <p className="text-xs text-slate-500 font-bold">{promotion.is_active ? 'המבצע מוצג ללקוחות' : 'המבצע מוסתר'}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setPromotion({ ...promotion, is_active: !promotion.is_active })}
                            className={`w-14 h-8 rounded-full relative transition-all duration-300 ${promotion.is_active ? 'bg-green-500' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-sm ${promotion.is_active ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-4 px-6 bg-white border border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-50 transition-all"
                    >
                        ביטול
                    </button>
                    <button 
                        onClick={onSave}
                        disabled={isUpdating || !promotion.title || !promotion.content}
                        className="flex-[2] py-4 px-6 bg-primary-500 text-white font-black rounded-2xl shadow-lg shadow-primary-200 hover:bg-primary-600 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                    >
                        {isUpdating ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save size={20} />
                                <span>{isEdit ? 'שמור שינויים' : 'צור מבצע'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PromotionFormModal;
