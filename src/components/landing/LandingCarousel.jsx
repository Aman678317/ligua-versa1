import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  {
    image: 'https://www.gstatic.com/meet/user_edu_get_a_link_light_90698cd7b4ca04d3005c962a3756c42d.svg',
    title: 'Get a link that you can share',
    description: (
      <>
        Click <strong className="font-semibold text-white">New meeting</strong> to get a link that you can send to people that you want to meet with
      </>
    )
  },
  {
    image: 'https://www.gstatic.com/meet/user_edu_scheduling_light_b352efa017e4f8f1ffda43e847820322.svg',
    title: 'Plan ahead',
    description: (
      <>
        Click <strong className="font-semibold text-white">New meeting</strong> to schedule meetings in advance and send invitations to participants
      </>
    )
  },
  {
    image: 'https://www.gstatic.com/meet/user_edu_safety_light_e04a2bbb449524ef7e49ea36d5f25b65.svg',
    title: 'Your meeting is safe',
    description: 'No one can join a meeting unless invited or admitted by the host'
  }
];

export default function LandingCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
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
            className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${
              index === currentIndex 
                ? 'opacity-100 translate-x-0 pointer-events-auto' 
                : index < currentIndex 
                  ? 'opacity-0 -translate-x-full pointer-events-none' 
                  : 'opacity-0 translate-x-full pointer-events-none'
            }`}
          >
            <div className="w-64 h-64 mb-6 flex items-center justify-center">
              <img 
                src={slide.image} 
                alt={slide.title} 
                className="w-full h-full object-contain pointer-events-none" 
                draggable="false"
              />
            </div>
            <h2 className="text-2xl font-normal text-white mb-3">
              {slide.title}
            </h2>
            <p className="text-[15px] text-slate-300 max-w-sm font-light leading-relaxed">
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
              index === currentIndex ? 'bg-[#00E5C7] scale-125' : 'bg-slate-600 hover:bg-slate-500'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
