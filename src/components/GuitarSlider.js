import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, RefreshCw, Globe, BookOpen } from 'lucide-react';

export default function GuitarSlider() {
  const [bulletins, setBulletins] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isDynamic, setIsDynamic] = useState(false);

  // Function to pull random news and facts from the web/backend
  const fetchBulletins = async () => {
    setLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE || '';
      const response = await fetch(`${apiBase}/api/guitar-bulletin`);
      const data = await response.json();
      setBulletins(data.bulletins || []);
      setIsDynamic(!!data.isDynamic);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Failed to fetch dynamic guitar bulletins:', error);
      // Hardcoded high-fidelity backup lists in case client fails to reach api
      const defaultBulletins = [
        {
          id: 'greeny_origin',
          category: 'ARTIST TRIVIA',
          title: 'How Gary Moore Kept Peter Green’s Vintage Legacy Alive',
          description: 'The legendary "Greeny" 1959 Gibson Les Paul Standard was sold by Fleetwood Mac founder Peter Green to Gary Moore in 1970 for just $300. Green wanted to ensure the instrument remained in the hands of a musician who would play it with true soul.',
          source: 'Fretboard Journal',
          date: 'Featured',
          imageUrl: '/src/assets/images/gibson_1959_greeny_1781878999953.jpg'
        },
        {
          id: 'voyager_solo',
          category: 'GUITAR FACT',
          title: 'The Only Guitar Solo Sailing in Interstellar Space',
          description: 'Chuck Berry\'s famous 1958 hit "Johnny B. Goode" is officially flying through deep interstellar space! The track was included on the Voyager Golden Records launched by NASA in 1977.',
          source: 'NASA Space Science',
          date: 'Daily Lore',
          imageUrl: '/src/assets/images/gibson_1958_flying_v_1781879034258.jpg'
        },
        {
          id: 'strat_golden_myth',
          category: 'GEAR NEWS',
          title: 'Fender’s First Stratocaster #0001 Gold Hardware Secret',
          description: 'The legendary Fender Stratocaster bearing serial number #0001 was not the first model off the line, but rather a rare personalized luxury commission with beautiful custom gold hardware historically owned by David Gilmour.',
          source: 'Guitar World',
          date: 'Trivia Today',
          imageUrl: '/src/assets/images/fender_1954_stratocaster_1781879018435.jpg'
        }
      ];
      setBulletins(defaultBulletins);
      setIsDynamic(false);
      setCurrentIndex(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBulletins();
  }, []);

  // Automatic rotation effect
  useEffect(() => {
    if (!isPlaying || loading || bulletins.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % bulletins.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPlaying, loading, bulletins]);

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + bulletins.length) % bulletins.length);
  };

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % bulletins.length);
  };

  const handleManualShuffle = () => {
    setIsPlaying(false);
    fetchBulletins();
  };

  if (loading) {
    return (
      <div 
        className="card" 
        style={{ 
          height: '400px', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: '#050505', 
          borderRadius: '1.5rem',
          border: '1px solid var(--border-color)',
          color: '#a1a1aa',
          gap: '1rem',
          marginBottom: '2rem'
        }}
        id="guitar-slider-loading"
      >
        <div className="animate-spin" style={{ color: 'var(--primary)' }}>
          <RefreshCw className="h-8 w-8" />
        </div>
        <p style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
          TUNING RADIO WAVES & SCRAPING DISCOVERIES...
        </p>
      </div>
    );
  }

  if (bulletins.length === 0) return null;

  const currentItem = bulletins[currentIndex];

  return (
    <div 
      className="card" 
      style={{ 
        padding: 0, 
        borderRadius: '1.5rem', 
        border: '1px solid var(--border-color)', 
        overflow: 'hidden', 
        position: 'relative',
        marginBottom: '2rem',
        backgroundColor: '#000000',
        color: '#ffffff'
      }}
      id="daily-guitar-bulletin-carousel"
    >
      {/* Dynamic Ambient Blurred Background Atmosphere */}
      <div 
        style={{ 
          position: 'absolute', 
          inset: 0, 
          backgroundImage: `url(${currentItem.imageUrl})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center', 
          filter: 'blur(40px) opacity(0.35)',
          transform: 'scale(1.15)',
          pointerEvents: 'none',
          transition: 'background-image 0.8s ease'
        }} 
      />

      <div 
        style={{ 
          position: 'relative', 
          display: 'grid', 
          gridTemplateColumns: window.innerWidth > 768 ? '1.1fr 1fr' : '1fr', 
          minHeight: '400px'
        }}
      >
        {/* Left Visual Stage */}
        <div 
          style={{ 
            position: 'relative', 
            height: window.innerWidth > 768 ? 'auto' : '230px',
            overflow: 'hidden',
            backgroundColor: '#050505',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: window.innerWidth > 768 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
          }}
        >
          <img 
            src={currentItem.imageUrl} 
            alt={currentItem.title}
            referrerPolicy="no-referrer"
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              transition: 'opacity 0.6s ease-in-out',
              display: 'block'
            }} 
          />
          {/* Shading Vignette Layer */}
          <div 
            style={{ 
              position: 'absolute', 
              inset: 0, 
              background: 'linear-gradient(to right, transparent 65%, rgba(0,0,0,0.85) 100%)',
              pointerEvents: 'none'
            }} 
          />

          {/* Dynamic Category Badge */}
          <div 
            style={{ 
              position: 'absolute', 
              top: '1rem', 
              left: '1rem', 
              backgroundColor: 'rgba(255, 90, 31, 0.95)', 
              color: '#ffffff', 
              padding: '0.4rem 0.8rem', 
              borderRadius: '2rem', 
              fontSize: '0.65rem', 
              fontWeight: 'bold', 
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              boxShadow: '0 4px 12px rgba(255, 90, 31, 0.4)',
              letterSpacing: '0.05em'
            }}
          >
            <BookOpen className="h-3 w-3" />
            <span>{currentItem.category || 'BULLETIN'}</span>
          </div>

          {/* Web Connection Indicator */}
          <div 
            style={{ 
              position: 'absolute', 
              bottom: '1rem', 
              left: '1rem', 
              backgroundColor: 'rgba(15, 23, 42, 0.8)', 
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#94a3b8', 
              padding: '0.3rem 0.6rem', 
              borderRadius: '2rem', 
              fontSize: '0.5625rem', 
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <Globe className="h-3 w-3" style={{ color: isDynamic ? '#10b981' : '#f59e0b' }} />
            <span>{isDynamic ? 'DAILY WEB UPDATE LIVE' : 'RANDOM ARCHIVE STREAM'}</span>
          </div>
        </div>

        {/* Right Information Panel */}
        <div 
          style={{ 
            padding: '2rem', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between', 
            position: 'relative',
            zIndex: 2,
            background: 'linear-gradient(135deg, rgba(13,13,13,0.96) 0%, rgba(5,5,5,0.99) 100%)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.25rem', color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Sparkles className="h-3 w-3 text-amber-500" /> Guitar Daily Bulletin
              </span>
              
              <button
                onClick={handleManualShuffle}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'}
                title="Fetch New Random Discoveries"
                aria-label="Refresh Guitar Bulletin"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            
            <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-serif)', fontWeight: 'bold', margin: '0.25rem 0 0.5rem 0', color: '#ffffff', lineHeight: 1.3 }}>
              {currentItem.title}
            </h3>

            {/* Quick Informational Metadata Matrices */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 0', margin: '0.25rem 0' }}>
              <div>
                <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>Published Source</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#e2e8f0', margin: '0.125rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>{currentItem.source || 'Around the Web'}</span>
                </p>
              </div>
              <div>
                <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>Daily Seeding</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#10b981', margin: '0.125rem 0 0 0', fontFamily: 'var(--font-mono)' }}>{currentItem.date || 'Today'}</p>
              </div>
            </div>

            {/* Detailed Explanatory Facts Block */}
            <p style={{ fontSize: '0.8125rem', color: '#cbd5e1', lineHeight: 1.6, margin: '0.25rem 0 0 0' }}>
              {currentItem.description}
            </p>
          </div>

          {/* Stepper Dot Selectors and Navigation Carousel Arrows */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            
            {/* Visual Dot Nav indicators */}
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {bulletins.map((item, i) => (
                <button
                  key={item.id || i}
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentIndex(i);
                  }}
                  style={{
                    height: '0.375rem',
                    width: i === currentIndex ? '1.25rem' : '0.375rem',
                    borderRadius: '999px',
                    backgroundColor: i === currentIndex ? 'var(--primary)' : 'rgba(255,255,255,0.2)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  title={`View Bulletin Slide ${i + 1}`}
                />
              ))}
            </div>

            {/* Previous and Next Steppers */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={handlePrev} 
                style={{ 
                  borderRadius: '50%', 
                  height: '2.25rem', 
                  width: '2.25rem', 
                  padding: 0, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                aria-label="Previous Guitar Bulletin Item"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <button 
                onClick={handleNext} 
                style={{ 
                  borderRadius: '50%', 
                  height: '2.25rem', 
                  width: '2.25rem', 
                  padding: 0, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                aria-label="Next Guitar Bulletin Item"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
