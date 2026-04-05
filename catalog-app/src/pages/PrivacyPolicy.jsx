import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Info, Eye, Lock, RefreshCw, Phone, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: "1. כללי",
      icon: Info,
      content: "מדיניות פרטיות זו מתארת כיצד Groopy (להלן: \"האפליקציה\") אוספת, משתמשת ומגנה על המידע האישי שלך בעת השימוש בקטלוג הדיגיטלי שלנו. אנו מחויבים להגן על פרטיותך ופועלים בהתאם לחוק הגנת הפרטיות, התשמ\"א-1981, כולל תיקון 13 לחוק."
    },
    {
      title: "2. איסוף מידע והצורך בו",
      icon: Eye,
      content: "בעת ביצוע הזמנה בקטלוג, אנו אוספים את הפרטים הבאים: שם מלא, מספר טלפון (באמצעות WhatsApp) ורשימת המוצרים שבחרת. מסירת מידע זה אינה חובה על פי חוק, אך ללא מסירתו לא נוכל לעבד את הזמנתך ולחזור אליך לתיאום אספקה."
    },
    {
      title: "3. מטרות השימוש במידע",
      icon: RefreshCw,
      content: "המידע נאסף למטרות הבאות: עיבוד הזמנות, יצירת קשר עם הלקוח לתיאום משלוח ותשלום, מתן שירות לקוחות ושיפור חווית המשתמש בקטלוג. אנו לא נעביר את פרטיך לצדדים שלישיים ללא הסכמתך, למעט במקרים הנדרשים על פי חוק."
    },
    {
      title: "4. זכויות נושא המידע (תיקון 13)",
      icon: ShieldCheck,
      content: "על פי החוק, הנך זכאי לעיין במידע המוחזק עליך במאגר המידע שלנו, לבקש את תיקונו במידה ואינו מדויק, או לבקש את מחיקתו. למימוש זכויות אלו, ניתן לפנות אלינו בפרטי ההתקשרות המופיעים מטה."
    },
    {
      title: "5. אבטחת מידע",
      icon: Lock,
      content: "אנו מיישמים אמצעי אבטחת מידע מתקדמים כדי להגן על המידע האישי שלך מפני גישה בלתי מורשית, שינוי או חשיפה. עם זאת, יש לזכור ששום מערכת אינה חסינה לחלוטין."
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
            <h1 className="text-4xl md:text-5xl font-[900] text-slate-900 tracking-tight mb-4">מדיניות פרטיות</h1>
            <p className="text-slate-500 text-lg font-medium">Groopy - קטלוג מוצרים דיגיטלי</p>
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
                <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-500 flex items-center justify-center">
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

        {/* Contact Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 p-10 bg-slate-900 rounded-[40px] text-white overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-[80px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/10 blur-[80px] rounded-full" />
          
          <div className="relative z-10">
            <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
              <span className="w-8 h-1 bg-primary-500 rounded-full" />
              יצירת קשר ומימוש זכויות
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <a href="tel:052-8366744" className="flex items-start md:items-center gap-4 group min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-primary-500 transition-colors">
                  <Phone size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">טלפון</p>
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
              * מדיניות זו עודכנה לאחרונה ב-5 באפריל 2026 ותואמת את דרישות תיקון 13 לחוק הגנת הפרטיות.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
