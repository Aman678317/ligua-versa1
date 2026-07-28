import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Link2, Calendar, ShieldCheck } from 'lucide-react';

const SlideIcon1 = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    <div className="absolute w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
    <div className="w-40 h-40 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center shadow-2xl z-10 relative">
      <Link2 className="w-20 h-20 text-[#00E5C7]" />
      <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.8)] border-2 border-slate-900">
        <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
      </div>
      <div className="absolute -bottom-2 -left-2 w-8 h-8 rounded-full bg-[#00E5C7] flex items-center justify-center shadow-[0_0_15px_rgba(0,229,199,0.8)] border-2 border-slate-900"></div>
    </div>
  </div>
);

const SlideIcon2 = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    <div className="absolute w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
    <div className="w-40 h-40 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center shadow-2xl z-10 relative">
      <Calendar className="w-20 h-20 text-indigo-400" />
      <div className="absolute -bottom-2 -left-2 w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.8)] border-2 border-slate-900 transform -rotate-12">
        <span className="text-white font-bold text-sm">24</span>
      </div>
    </div>
  </div>
);

const SlideIcon3 = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    <div className="absolute w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
    <div className="w-40 h-40 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center shadow-2xl z-10 relative">
      <ShieldCheck className="w-20 h-20 text-emerald-400" />
      <div className="absolute inset-0 rounded-full border-[3px] border-emerald-500/20 animate-[spin_6s_linear_infinite] border-t-emerald-400"></div>
      <div className="absolute inset-[-10px] rounded-full border-[2px] border-emerald-500/10 animate-[spin_4s_linear_infinite_reverse] border-b-emerald-300"></div>
    </div>
  </div>
);

const slides = [
  {
    icon: <SlideIcon1 />,
    title: 'Get a link that you can share',
    description: (
      <>
        Click <strong className="font-semibold text-white">New meeting</strong> to get a link that you can send to people that you want to meet with
      </>
    )
  },
  {
    icon: <SlideIcon2 />,
    title: 'Plan ahead',
    description: (
      <>
        Click <strong className="font-semibold text-white">New meeting</strong> to schedule meetings in advance and send invitations to participants
      </>
    )
  },
  {
    icon: <SlideIcon3 />,
    title: 'Your meeting is safe',
    description: 'No one can join a meeting unless invited or admitted by the host. LinguaVersa uses secure WebRTC encryption.'
  }
];

export default function LandingCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 6000); // Slower transition to admire animations
    return () => clearInterval(timer);
  }, []);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className="relative w-full max-w-[500px] flex flex-col items-center justify-center p-6 text-center select-none">
      
      {/* Navigation Buttons */}
      <button 
        onClick={handlePrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-800/50 text-slate-400 hover:text-white transition-colors z-10"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      
      <button 
        onClick={handleNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-800/50 text-slate-400 hover:text-white transition-colors z-10"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Slide Content */}
      <div className="w-full h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
        {slides.map((slide, index) => (
          <div 
            key={index}
            className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
              index === currentIndex 
                ? 'opacity-100 translate-x-0 pointer-events-auto scale-100' 
                : index < currentIndex 
                  ? 'opacity-0 -translate-x-full pointer-events-none scale-95' 
                  : 'opacity-0 translate-x-full pointer-events-none scale-95'
            }`}
          >
            <div className="w-64 h-64 mb-6 flex items-center justify-center">
              {slide.icon}
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
              {slide.title}
            </h2>
            <p className="text-[15px] text-slate-300 max-w-sm font-medium leading-relaxed">
              {slide.description}
            </p>
          </div>
        ))}
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center gap-2 mt-4">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              index === currentIndex ? 'bg-[#00E5C7] scale-150 w-4' : 'bg-slate-600 hover:bg-slate-500'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
