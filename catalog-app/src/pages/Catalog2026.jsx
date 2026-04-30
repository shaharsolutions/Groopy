import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import { ChevronLeft, ChevronRight, Download, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

// PDF Worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDFPage = React.forwardRef((props, ref) => {
  return (
    <div className="page bg-white" ref={ref} style={{ width: props.width, height: props.height }}>
      <Page 
        pageNumber={props.number} 
        width={props.width}
        height={props.height}
        renderAnnotationLayer={false}
        renderTextLayer={false}
        scale={1}
        devicePixelRatio={1}
        loading={
          <div className="flex items-center justify-center bg-slate-100" style={{ width: props.width, height: props.height }}>
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      />
    </div>
  );
});

const Catalog2026 = () => {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const flipBookRef = useRef(null);
  const containerRef = useRef(null);

  function onDocumentLoadSuccess({ numPages }) {
    console.log("PDF Document loaded with", numPages, "pages");
    setNumPages(numPages);
    setIsLoaded(true);
  }

  function onDocumentLoadError(error) {
    console.error("PDF Document Load Error:", error);
    setLoadError(error.message);
  }

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        // Asymmetric padding: minimal at top, more at sides/bottom for controls
        let paddingTop = 10;
        let paddingBottom = 30;
        let paddingX = 40;
        
        let availableWidth = containerWidth - (paddingX * 2);
        let availableHeight = containerHeight - (paddingTop + paddingBottom);

        let pageWidth = availableWidth / 2;
        let pageHeight = pageWidth * 1.414;

        if (pageHeight > availableHeight) {
          pageHeight = availableHeight;
          pageWidth = pageHeight / 1.414;
        }

        setDimensions({ 
          width: Math.floor(pageWidth), 
          height: Math.floor(pageHeight) 
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    const timer = setTimeout(updateDimensions, 500);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timer);
    };
  }, []);

  const nextButtonClick = () => {
    if (flipBookRef.current) flipBookRef.current.pageFlip().flipNext();
  };

  const prevButtonClick = () => {
    if (flipBookRef.current) flipBookRef.current.pageFlip().flipPrev();
  };

  const onPage = (e) => {
    setCurrentPage(e.data);
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-white flex flex-col font-sans overflow-hidden" dir="rtl">
      <header className="p-3 md:px-8 flex justify-between items-center bg-[#1a1d23]/90 backdrop-blur-xl border-b border-white/5 z-20">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-white/10 rounded-full transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:translate-x-1 transition-transform rotate-180" />
          </Link>
          <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Groopy 2026</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 bg-white/5 px-4 py-1.5 rounded-full border border-white/10" dir="ltr">
             <span className="text-sm font-black text-white">{currentPage + 1}-{Math.min(currentPage + 2, numPages || 0)} <span className="text-slate-500 font-normal">/</span> {numPages || '...'}</span>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">PAGES</span>
          </div>
          <a href="/catalog2026/CatalogWeb%202026.pdf" download className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 px-4 py-2 rounded-full transition-all shadow-lg text-sm font-bold">
            <Download className="w-4 h-4" /> PDF
          </a>
        </div>
      </header>

      <main ref={containerRef} className="flex-1 relative flex items-start justify-center overflow-hidden bg-[#0f1115] pt-2">
        {loadError && (
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center max-w-md z-30">
            <h2 className="text-red-400 font-bold text-lg mb-2">שגיאה בטעינת הקובץ</h2>
            <p className="text-slate-400 text-sm mb-4">{loadError}</p>
            <button onClick={() => window.location.reload()} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold">נסה שוב</button>
          </div>
        )}

        {!isLoaded && !loadError && (
          <div className="flex flex-col items-center gap-4 animate-pulse z-30">
            <div className="w-12 h-12 border-4 border-white/5 border-t-primary-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm font-bold">מכין את הקטלוג...</p>
          </div>
        )}

        <div className={`relative ${!isLoaded ? 'opacity-0' : 'opacity-100'}`} dir="ltr">
          <Document
            file="/catalog2026/CatalogWeb%202026.pdf"
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            className="flex justify-center"
          >
            {isLoaded && dimensions.width > 0 && (
              <HTMLFlipBook
                width={dimensions.width}
                height={dimensions.height}
                size="fixed"
                minWidth={200}
                maxWidth={1400}
                minHeight={300}
                maxHeight={2000}
                drawShadow={true}
                flippingTime={800}
                usePortrait={false}
                startZIndex={0}
                autoSize={true}
                maxShadowOpacity={0.4}
                showCover={false}
                mobileScrollSupport={true}
                onFlip={onPage}
                className="catalog-book"
                ref={flipBookRef}
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
            )}
          </Document>

          {isLoaded && (
            <>
              <button onClick={prevButtonClick} disabled={currentPage === 0} className="absolute -left-12 md:-left-20 top-1/2 -translate-y-1/2 p-4 bg-white/5 hover:bg-white/10 disabled:opacity-0 rounded-full border border-white/10 transition-all z-10">
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button onClick={nextButtonClick} disabled={currentPage >= (numPages || 0) - 2} className="absolute -right-12 md:-right-20 top-1/2 -translate-y-1/2 p-4 bg-white/5 hover:bg-white/10 disabled:opacity-0 rounded-full border border-white/10 transition-all z-10">
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}
        </div>
      </main>

      <footer className="p-3 bg-[#1a1d23] flex justify-between items-center px-8 z-20 border-t border-white/5">
        <div className="flex items-center gap-6">
          <button onClick={() => flipBookRef.current?.pageFlip().flip(0)} className="text-[10px] text-slate-500 hover:text-white uppercase font-black">התחלה</button>
          <button onClick={() => flipBookRef.current?.pageFlip().flip(numPages - 1)} className="text-[10px] text-slate-500 hover:text-white uppercase font-black">סוף</button>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></div>
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Interactive</span>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .page {
          background-color: white;
          overflow: hidden;
        }
        .catalog-book {
          box-shadow: 0 0 50px rgba(0,0,0,0.5);
        }
        .react-pdf__Page {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
        }
        .react-pdf__Page__canvas {
          max-width: 100% !important;
          max-height: 100% !important;
          height: auto !important;
          width: auto !important;
          display: block !important;
        }
        .page-even {
          box-shadow: inset -20px 0 30px -20px rgba(0,0,0,0.3) !important;
        }
        .page-odd {
          box-shadow: inset 20px 0 30px -20px rgba(0,0,0,0.3) !important;
        }
      `}} />
    </div>
  );
};

export default Catalog2026;
