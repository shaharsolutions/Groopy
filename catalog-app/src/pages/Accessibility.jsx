import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Accessibility as AccessIcon, CheckCircle2, AlertCircle, Phone, Mail, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const Accessibility = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: "1. המטרה שלנו",
      icon: HelpCircle,
      content: "אנו ב-Groopy רואים חשיבות עליונה בהנגשת השירותים שלנו לכלל האוכלוסייה, כולל אנשים עם מוגבלות. אנו מאמינים כי המרחב הדיגיטלי צריך להיות שוויוני ונגיש לכולם, ומשקיעים מאמצים רבים כדי להבטיח חויית משתמש נוחה ומכבדת."
    },
    {
      title: "2. רמת הנגישות",
      icon: AccessIcon,
      content: "האתר הותאם לדרישות הנגישות לפי תקן ישראלי 5568 והנחיות WCAG 2.1 ברמה AA. ביצענו התאמות טכנולוגיות וויזואליות כדי להבטיח תאימות מרבית לדפדפנים מודרניים ולמערכות עזר."
    },
    {
      title: "3. מה בוצע באתר?",
      icon: CheckCircle2,
      content: "התאמנו את הניווט במקלדת, הוספנו תגיות סמנטיות (Semantic HTML), הגדרנו יחסי ניגודיות תקינים בין הטקסט לרקע, והוספנו תיאורי טקסט (Alt text) לתמונות המוצרים. בנוסף, האתר מותאם לקוראי מסך פופולריים."
    },
    {
      title: "4. סייגים לנגישות",
      icon: AlertCircle,
      content: "למרות מאמצינו, ייתכן שחלקים מסוימים באתר (כגון רכיבים חיצוניים או תכנים ישנים) אינם מונגשים באופן מלא. אנו פועלים כל העת לשיפור המצב ומחויבים לפתרון כל בעיה שתעלה."
    }
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFE] text-slate-900 font-sans px-6 py-12 md:py-20" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-[900] text-slate-900 tracking-tight mb-4">הצהרת נגישות</h1>
            <p className="text-slate-500 text-lg font-medium">התאמת הממשק לכלל המשתמשים</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm w-fit"
          >
            <ArrowRight size={20} />
            <span>חזרה לקטלוג</span>
          </button>
        </motion.div>

        {/* Content Sections */}
        <div className="space-y-8">
          {sections.map((section, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-accent-50 text-accent-500 flex items-center justify-center">
                  <section.icon size={24} />
                </div>
                <h2 className="text-2xl font-black text-slate-800">{section.title}</h2>
              </div>
              <p className="text-slate-600 leading-relaxed text-lg font-medium">
                {section.content}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Accessibility Contact */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 p-10 bg-slate-900 rounded-[40px] text-white overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 w-64 h-64 bg-accent-500/10 blur-[80px] rounded-full" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary-500/10 blur-[80px] rounded-full" />
          
          <div className="relative z-10">
            <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
              <span className="w-8 h-1 bg-accent-500 rounded-full" />
              דיווח על בעיית נגישות
            </h3>
            
            <p className="text-slate-300 mb-8 text-lg font-medium">
              אם נתקלתם בקושי בגלישה או אם יש לכם הצעה לשיפור הנגישות, נשמח לשמוע מכם ולטפל בפנייה בהקדם האפשרי.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <a href="tel:052-8366744" className="flex items-start md:items-center gap-4 group min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-primary-500 transition-colors">
                  <Phone size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">רכז נגישות</p>
                  <p className="text-lg md:text-xl font-bold tracking-tight">052-8366744 (שחר)</p>
                </div>
              </a>

              <a href="mailto:shaharsolutions@gmail.com" className="flex items-start md:items-center gap-4 group min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-accent-500 transition-colors">
                  <Mail size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">דואר אלקטרוני</p>
                  <p className="text-lg md:text-xl font-bold tracking-tight break-all md:break-normal">shaharsolutions@gmail.com</p>
                </div>
              </a>
            </div>
            
            <p className="mt-12 text-slate-400 text-sm font-medium border-t border-white/10 pt-8 italic">
              * הצהרת נגישות זו עודכנה לאחרונה ב-5 באפריל 2026.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Accessibility;
