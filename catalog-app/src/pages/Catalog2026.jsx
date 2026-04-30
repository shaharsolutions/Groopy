import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import { ChevronLeft, ChevronRight, Download, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

// PDF Worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDFPage = React.forwardRef((props, ref) => {
  return (
    <div className="page bg-white" ref={ref}>
      <div className="w-full h-full flex items-center justify-center">
        <Page 
          pageNumber={props.number} 
          width={props.width}
          height={props.height}
          renderAnnotationLayer={false}
          renderTextLayer={false}
          className="shadow-inner"
          loading={
            <div className="flex items-center justify-center" style={{ width: props.width, height: props.height }}>
              <div className="w-8 h-8 border-2 border-slate-200 border-t-primary-500 rounded-full animate-spin" />
            </div>
          }
        />
      </div>
    </div>
  );
});

const Catalog2026 = () => {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const flipBookRef = useRef(null);
  const containerRef = useRef(null);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setIsLoaded(true);
  }

  // Update dimensions based on container size
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;
        
        let padding = 80;
        let availableWidth = containerWidth - padding;
        let availableHeight = containerHeight - padding;

        let pageWidth = availableWidth / 2;
        let pageHeight = pageWidth * 1.414;

        if (pageHeight > availableHeight) {
          pageHeight = availableHeight;
          pageWidth = pageHeight / 1.414;
        }

        setDimensions({ width: Math.floor(pageWidth), height: Math.floor(pageHeight) });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    const timer = setTimeout(updateDimensions, 100);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timer);
    };
  }, []);

  const nextButtonClick = () => {
    flipBookRef.current.pageFlip().flipNext();
  };

  const prevButtonClick = () => {
    flipBookRef.current.pageFlip().flipPrev();
  };

  const onPage = (e) => {
    setCurrentPage(e.data);
  };

  return (
    <div className="min-h-screen bg-[#1a1c23] text-white flex flex-col font-sans overflow-hidden" dir="rtl">
      {/* Header */}
      <header className="p-4 md:px-8 flex justify-between items-center bg-[#252833]/80 backdrop-blur-xl border-b border-white/5 z-20">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-white/10 rounded-full transition-colors group">
            <ArrowLeft className="w-6 h-6 group-hover:translate-x-1 transition-transform rotate-180" />
          </Link>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">קטלוג Groopy 2026</h1>
            <p className="text-[10px] uppercase tracking-widest text-primary-400 font-bold">Premium Experience</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10" dir="ltr">
             <span className="text-sm font-black text-white">{currentPage + 1}-{Math.min(currentPage + 2, numPages || 0)} <span className="text-slate-500 font-normal">/</span> {numPages || '...'}</span>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">PAGES</span>
          </div>
          
          <a 
            href="/catalog2026.pdf" 
            download 
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 px-5 py-2.5 rounded-full transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] text-sm font-bold"
          >
            <Download className="w-4 h-4" />
            PDF
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main ref={containerRef} className="flex-1 relative flex items-center justify-center p-4 md:p-12 overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-950">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        {!isLoaded && (
          <div className="flex flex-col items-center gap-6 animate-pulse">
            <div className="w-16 h-16 border-4 border-white/5 border-t-primary-500 rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-white font-bold text-lg">טוען קטלוג דיגיטלי</p>
              <p className="text-slate-500 text-sm">מכין את חווית הדפדוף...</p>
            </div>
          </div>
        )}

        {isLoaded && dimensions.width > 0 && (
          <div className="relative group/book" dir="ltr">
            <Document
              file="/catalog2026.pdf"
              onLoadSuccess={onDocumentLoadSuccess}
              className="flex justify-center"
            >
              <HTMLFlipBook
                width={dimensions.width}
                height={dimensions.height}
                size="fixed"
                minWidth={200}
                maxWidth={1000}
                minHeight={300}
                maxHeight={1414}
                drawShadow={true}
                flippingTime={800}
                usePortrait={false}
                startZIndex={0}
                autoSize={true}
                maxShadowOpacity={0.3}
                showCover={false}
                mobileScrollSupport={true}
                onFlip={onPage}
                className="shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]"
                ref={flipBookRef}
                style={{ backgroundColor: 'transparent' }}
              >
                {Array.from(new Array(numPages), (el, index) => (
                  <PDFPage 
                    key={`page_${index + 1}`} 
                    number={index + 1} 
                    width={dimensions.width} 
                    height={dimensions.height}
                  />
                ))}
              </HTMLFlipBook>
            </Document>

            <button 
              onClick={prevButtonClick}
              disabled={currentPage === 0}
              className="absolute -left-12 md:-left-20 top-1/2 -translate-y-1/2 p-5 bg-white/5 hover:bg-white/10 disabled:opacity-0 disabled:pointer-events-none backdrop-blur-md rounded-full border border-white/10 transition-all z-10 group/btn"
            >
              <ChevronLeft className="w-8 h-8 group-hover/btn:-translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={nextButtonClick}
              disabled={currentPage >= numPages - 2}
              className="absolute -right-12 md:-right-20 top-1/2 -translate-y-1/2 p-5 bg-white/5 hover:bg-white/10 disabled:opacity-0 disabled:pointer-events-none backdrop-blur-md rounded-full border border-white/10 transition-all z-10 group/btn"
            >
              <ChevronRight className="w-8 h-8 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </main>

      <footer className="p-4 bg-[#252833]/80 backdrop-blur-xl flex justify-between items-center px-8 z-20 border-t border-white/5">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => flipBookRef.current.pageFlip().flip(0)} 
            className="text-[10px] text-slate-500 hover:text-primary-400 uppercase tracking-[0.2em] font-black transition-colors"
          >
            התחלה
          </button>
          <div className="w-px h-3 bg-white/10"></div>
          <button 
            onClick={() => flipBookRef.current.pageFlip().flip(numPages - 1)} 
            className="text-[10px] text-slate-500 hover:text-primary-400 uppercase tracking-[0.2em] font-black transition-colors"
          >
            סוף
          </button>
        </div>

        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Interactive Catalog</span>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .page {
          background-color: white;
          box-shadow: inset 0 0 10px rgba(0,0,0,0.1);
        }
        .stf__parent {
          perspective: 2000px;
        }
        .react-pdf__Page__canvas {
          max-width: 100% !important;
          max-height: 100% !important;
          height: auto !important;
          width: auto !important;
        }
        .react-pdf__Document {
          display: flex;
          justify-content: center;
        }
      `}} />
    </div>
  );
};

export default Catalog2026;
