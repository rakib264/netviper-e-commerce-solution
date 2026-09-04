'use client';

import { Button } from '@/components/ui/button';
import { Display, Heading, Text, Caption } from '@/components/ui/typography';
import { motion } from 'framer-motion';
import { ArrowRight, Gift, Sparkles, Star, Users } from 'lucide-react';
import Link from 'next/link';

export default function HeroPromo() {
  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-foreground via-primary-900 to-foreground text-white relative overflow-hidden font-paragraph">
      {/* Simplified Background Elements */}
      <div className="absolute inset-0">
        {/* Subtle gradient orbs */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-secondary-500/10 to-destructive-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-info-500/10 to-info-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-primary-500/8 to-secondary-500/8 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="w-full">
          {/* Main Title Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center mb-16 lg:mb-20"
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-card/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full mb-6"
            >
              <Sparkles className="text-secondary-300" size={16} />
              <Caption weight="semibold" color="white">Premium Fashion Collection</Caption>
            </motion.div>

            <Display size="xs" weight="bold" leading="tight" className="mb-6 font-navigation">
              <span className="bg-gradient-to-r from-secondary-300 via-primary-300 to-info-300 bg-clip-text text-transparent">
                Luxury Fashion
              </span>
              <br />
              <span className="text-white">For Everyone</span>
            </Display>

            <Text size="xl" leading="relaxed" className="text-primary-100 mb-8 max-w-4xl mx-auto">
              Discover our curated collection of organic fresh food for healthy families and individuals. 
              Experience luxury, style, and quality in every piece.
            </Text>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link href="/products">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-gradient-to-r from-secondary-500 to-primary-500 hover:from-secondary-600 hover:to-primary-600 text-white px-8 py-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 font-button font-semibold text-base"
                >
                  Explore Collection
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </Link>
              <Link href="/deals">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto border-white/30 text-white hover:bg-card/10 px-8 py-4 rounded-2xl font-button font-semibold text-base"
                >
                  View Deals
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Fashion Categories Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 lg:gap-8 mb-16"
          >
            {/* Women's Fashion */}
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ duration: 0.3 }}
              className="group cursor-pointer"
            >
              <Link href="/categories/women">
                <div className="w-full h-32 md:h-40 lg:h-48 bg-gradient-to-br from-secondary-500/40 to-destructive-500/40 rounded-2xl backdrop-blur-sm border border-white/30 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:from-secondary-500/50 group-hover:to-destructive-500/50">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative h-full flex flex-col items-center justify-center p-4">
                    <motion.div 
                      className="text-3xl md:text-4xl lg:text-5xl mb-2"
                      animate={{ 
                        y: [0, -5, 0],
                        rotate: [0, 2, -2, 0]
                      }}
                      transition={{ 
                        duration: 4, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                    >
                      👗
                    </motion.div>
                    <Heading level={6} weight="bold" color="white" className="text-center font-navigation group-hover:text-secondary-100 transition-colors duration-300">Women's</Heading>
                    <Caption className="text-secondary-200 text-center group-hover:text-secondary-100 transition-colors duration-300">Elegant</Caption>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Men's Fashion */}
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ duration: 0.3 }}
              className="group cursor-pointer"
            >
              <Link href="/categories/men">
                <div className="w-full h-32 md:h-40 lg:h-48 bg-gradient-to-br from-info-500/40 to-info-500/40 rounded-2xl backdrop-blur-sm border border-white/30 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:from-info-500/50 group-hover:to-info-500/50">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative h-full flex flex-col items-center justify-center p-4">
                    <motion.div 
                      className="text-3xl md:text-4xl lg:text-5xl mb-2"
                      animate={{ 
                        y: [0, -5, 0],
                        rotate: [0, -2, 2, 0]
                      }}
                      transition={{ 
                        duration: 4, 
                        repeat: Infinity, 
                        ease: "easeInOut",
                        delay: 0.5
                      }}
                    >
                      👔
                    </motion.div>
                    <Heading level={6} weight="bold" color="white" className="text-center font-navigation group-hover:text-info-100 transition-colors duration-300">Men's</Heading>
                    <Caption className="text-info-200 text-center group-hover:text-info-100 transition-colors duration-300">Sharp</Caption>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Boys Fashion */}
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ duration: 0.3 }}
              className="group cursor-pointer"
            >
              <Link href="/categories/boys">
                <div className="w-full h-32 md:h-40 lg:h-48 bg-gradient-to-br from-success-500/40 to-success-500/40 rounded-2xl backdrop-blur-sm border border-white/30 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:from-success-500/50 group-hover:to-success-500/50">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative h-full flex flex-col items-center justify-center p-4">
                    <motion.div 
                      className="text-3xl md:text-4xl lg:text-5xl mb-2"
                      animate={{ 
                        y: [0, -5, 0],
                        rotate: [0, 2, -2, 0]
                      }}
                      transition={{ 
                        duration: 4, 
                        repeat: Infinity, 
                        ease: "easeInOut",
                        delay: 1
                      }}
                    >
                      👦
                    </motion.div>
                    <Heading level={6} weight="bold" color="white" className="text-center font-navigation group-hover:text-success-100 transition-colors duration-300">Boys</Heading>
                    <Caption className="text-success-200 text-center group-hover:text-success-100 transition-colors duration-300">Cool</Caption>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Girls Fashion */}
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ duration: 0.3 }}
              className="group cursor-pointer"
            >
              <Link href="/categories/girls">
                <div className="w-full h-32 md:h-40 lg:h-48 bg-gradient-to-br from-primary-500/40 to-secondary-500/40 rounded-2xl backdrop-blur-sm border border-white/30 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:from-primary-500/50 group-hover:to-secondary-500/50">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative h-full flex flex-col items-center justify-center p-4">
                    <motion.div 
                      className="text-3xl md:text-4xl lg:text-5xl mb-2"
                      animate={{ 
                        y: [0, -5, 0],
                        rotate: [0, -2, 2, 0]
                      }}
                      transition={{ 
                        duration: 4, 
                        repeat: Infinity, 
                        ease: "easeInOut",
                        delay: 1.5
                      }}
                    >
                      👧
                    </motion.div>
                    <Heading level={6} weight="bold" color="white" className="text-center font-navigation group-hover:text-primary-100 transition-colors duration-300">Girls</Heading>
                    <Caption className="text-primary-200 text-center group-hover:text-primary-100 transition-colors duration-300">Cute</Caption>
                  </div>
                </div>
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats Section - Hidden on Mobile */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="hidden md:grid grid-cols-3 gap-6 lg:gap-8 xl:gap-12"
          >
            <motion.div 
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ duration: 0.3 }}
              className="text-center p-6 bg-card/10 backdrop-blur-sm border border-white/20 rounded-2xl hover:bg-card/15 transition-all duration-300 group"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
              >
                <Users className="text-secondary-300 mx-auto mb-3 group-hover:text-secondary-200 transition-colors duration-300" size={28} />
              </motion.div>
              <Heading level={3} weight="bold" className="mb-1 font-navigation bg-gradient-to-r from-secondary-300 to-secondary-200 bg-clip-text text-transparent">10K+</Heading>
              <Caption className="text-primary-200 group-hover:text-primary-100 transition-colors duration-300">Happy Customers</Caption>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ duration: 0.3 }}
              className="text-center p-6 bg-card/10 backdrop-blur-sm border border-white/20 rounded-2xl hover:bg-card/15 transition-all duration-300 group"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, -5, 5, 0]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: 0.5
                }}
              >
                <Star className="text-warning-300 mx-auto mb-3 group-hover:text-warning-200 transition-colors duration-300" size={28} />
              </motion.div>
              <Heading level={3} weight="bold" className="mb-1 font-navigation bg-gradient-to-r from-warning-300 to-warning-200 bg-clip-text text-transparent">4.8</Heading>
              <Caption className="text-primary-200 group-hover:text-primary-100 transition-colors duration-300">Average Rating</Caption>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ duration: 0.3 }}
              className="text-center p-6 bg-card/10 backdrop-blur-sm border border-white/20 rounded-2xl hover:bg-card/15 transition-all duration-300 group"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: 1
                }}
              >
                <Gift className="text-primary-300 mx-auto mb-3 group-hover:text-primary-200 transition-colors duration-300" size={28} />
              </motion.div>
              <Heading level={3} weight="bold" className="mb-1 font-navigation bg-gradient-to-r from-primary-300 to-primary-200 bg-clip-text text-transparent">500+</Heading>
              <Caption className="text-primary-200 group-hover:text-primary-100 transition-colors duration-300">Products</Caption>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
