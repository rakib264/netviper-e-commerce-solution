'use client';

import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Shield, ShoppingBag, Truck, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

const heroSlides = [
  {
    id: 1,
    title: "Experience the Future of Shopping",
    subtitle: "AI-Powered E-commerce Platform",
    description: "Discover premium products with intelligent recommendations, smart logistics, and seamless shopping experience in Bangladesh.",
    image: "https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=1200",
    cta: "Shop Now",
    features: ["AI Recommendations", "Smart Delivery", "Premium Quality"]
  },
  {
    id: 2,
    title: "Smart Shopping Made Simple",
    subtitle: "Your Trusted Marketplace",
    description: "Browse thousands of products with advanced filters, real-time inventory, and instant support from our AI assistant.",
    image: "https://images.pexels.com/photos/5632398/pexels-photo-5632398.jpeg?auto=compress&cs=tinysrgb&w=1200",
    cta: "Explore Products",
    features: ["24/7 AI Support", "Fast Delivery", "Secure Payments"]
  },
  {
    id: 3,
    title: "Premium Brands, Unbeatable Prices",
    subtitle: "Exclusive Collections",
    description: "Access exclusive collections from top brands with special discounts, authentic products, and guaranteed satisfaction.",
    image: "https://images.pexels.com/photos/5632401/pexels-photo-5632401.jpeg?auto=compress&cs=tinysrgb&w=1200",
    cta: "View Deals",
    features: ["Authentic Products", "Best Prices", "Satisfaction Guaranteed"]
  }
];

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [mounted]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden font-paragraph">
      {/* Background Images */}
      {mounted && (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${heroSlides[currentSlide].image})`,
            }}
          />
        </AnimatePresence>
      )}
      
      {/* Fallback background for SSR */}
      {!mounted && (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${heroSlides[0].image})`,
          }}
        />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center text-white">
        {mounted ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-4xl mx-auto"
            >
            <motion.h2 
              className="font-label text-sm md:text-lg font-medium mb-4 text-info-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {heroSlides[currentSlide].subtitle}
            </motion.h2>
            
            <motion.h1 
              className="font-navigation text-4xl md:text-6xl lg:text-7xl font-semibold mb-6 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {heroSlides[currentSlide].title}
            </motion.h1>
            
            <motion.p 
              className="font-paragraph text-lg md:text-xl mb-8 text-gray-200 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {heroSlides[currentSlide].description}
            </motion.p>

            {/* Features */}
            <motion.div 
              className="flex flex-wrap justify-center gap-6 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {heroSlides[currentSlide].features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2 font-caption text-sm">
                  <div className="w-2 h-2 bg-info-400 rounded-full" />
                  <span>{feature}</span>
                </div>
              ))}
            </motion.div>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Button size="lg" className="text-lg px-8 py-3 bg-primary hover:bg-primary/90 font-button">
                <ShoppingBag className="mr-2" size={20} />
                {heroSlides[currentSlide].cta}
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-3 border-white text-white hover:bg-card hover:text-black font-button"
              >
                Learn More
              </Button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
        ) : (
          // Static content for SSR to prevent hydration mismatch
          <div className="max-w-4xl mx-auto">
            <h2 className="font-label text-sm md:text-lg font-medium mb-4 text-info-200">
              {heroSlides[0].subtitle}
            </h2>
            <h1 className="font-navigation text-4xl md:text-6xl lg:text-7xl font-semibold mb-6 leading-tight">
              {heroSlides[0].title}
            </h1>
            <p className="font-paragraph text-lg md:text-xl mb-8 text-gray-200 max-w-2xl mx-auto">
              {heroSlides[0].description}
            </p>
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              {heroSlides[0].features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2 font-caption text-sm">
                  <div className="w-2 h-2 bg-info-400 rounded-full" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="font-button text-lg px-8 py-3 bg-primary hover:bg-primary/90 rounded-md font-medium">
                {heroSlides[0].cta}
              </button>
              <button className="font-button text-lg px-8 py-3 border border-white text-white hover:bg-card hover:text-black rounded-md font-medium">
                Learn More
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Arrows - only show when mounted */}
      {mounted && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-card/20 p-3"
          >
            <ChevronLeft size={24} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-card/20 p-3"
          >
            <ChevronRight size={24} />
          </Button>

          {/* Slide Indicators */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex space-x-2">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentSlide 
                    ? 'bg-card scale-110' 
                    : 'bg-card/50 hover:bg-card/75'
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Features Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white text-center">
            <div className="flex items-center justify-center space-x-2">
              <Zap className="text-warning-400" size={20} />
              <span className="font-label text-sm">AI-Powered Shopping</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Truck className="text-success-400" size={20} />
              <span className="font-label text-sm">Fast Delivery Nationwide</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Shield className="text-info-400" size={20} />
              <span className="font-label text-sm">Secure & Trusted</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}