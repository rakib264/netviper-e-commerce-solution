'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Award, Heart, Shield, Sparkles, Users } from 'lucide-react';
import Link from 'next/link';

export default function BrandStory() {
  const features = [
    {
      icon: Heart,
      title: "Passion for Fashion",
      description: "We believe fashion is an expression of individuality and creativity."
    },
    {
      icon: Shield,
      title: "Quality Assurance",
      description: "Every product is carefully selected and quality-tested for your satisfaction."
    },
    {
      icon: Users,
      title: "Community First",
      description: "Building a community of fashion enthusiasts who share our values."
    },
    {
      icon: Award,
      title: "Award Winning",
      description: "Recognized for excellence in customer service and product quality."
    }
  ];

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-muted via-white to-info-50 relative overflow-hidden font-paragraph">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-info-100/40 to-info-100/40 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-primary-100/40 to-secondary-100/40 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left Content - Story */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="order-2 lg:order-1"
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-info-500/10 to-primary-500/10 backdrop-blur-sm border border-info-400/30 px-3 py-2 rounded-full font-label text-xs sm:text-sm font-semibold text-info-700 mb-4 lg:mb-6"
            >
              <Sparkles className="text-info-600" size={14} />
              <span>Our Story</span>
            </motion.div>

            <h2 className="font-navigation text-3xl sm:text-4xl lg:text-5xl font-semibold mb-4 lg:mb-6 leading-tight">
              <span className="bg-gradient-to-r from-info-600 via-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Crafting Fashion
              </span>
              <br />
              <span className="text-foreground">Excellence Since 2020</span>
            </h2>

            <p className="font-paragraph text-base sm:text-lg text-muted-foreground mb-6 lg:mb-8 leading-relaxed">
              Founded with a vision to democratize fashion, we've been curating premium 
              collections that blend timeless elegance with contemporary trends. Our journey 
              began with a simple belief: everyone deserves access to high-quality, 
              affordable fashion that makes them feel confident and beautiful.
            </p>

            <p className="font-paragraph text-base sm:text-lg text-muted-foreground mb-6 lg:mb-8 leading-relaxed">
              Today, we're proud to serve over 50,000 customers worldwide, offering 
              carefully selected pieces that celebrate individuality and style. From 
              sustainable materials to ethical manufacturing, we're committed to 
              making fashion that's not just beautiful, but responsible.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link href="/about">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-gradient-to-r from-info-500 to-primary-500 hover:from-info-600 hover:to-primary-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 font-button font-semibold text-sm sm:text-base"
                >
                  Our Story
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto border-info-500/30 text-info-600 hover:bg-info-50 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-button font-semibold text-sm sm:text-base"
                >
                  Contact Us
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Right Content - Features Grid */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 order-1 lg:order-2"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
                whileHover={{ 
                  y: -5,
                  transition: { duration: 0.3 }
                }}
                className="bg-card/60 backdrop-blur-sm border border-white/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <motion.div
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-info-500 to-primary-500 rounded-lg sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4"
                  whileHover={{ 
                    scale: 1.1,
                    rotate: 5
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <feature.icon className="text-white" size={20} />
                </motion.div>
                <h3 className="font-navigation text-base sm:text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="font-paragraph text-muted-foreground text-xs sm:text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {[
            { number: "50K+", label: "Happy Customers" },
            { number: "4.9", label: "Average Rating" },
            { number: "100+", label: "Brand Partners" },
            { number: "24/7", label: "Customer Support" }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ 
                duration: 0.6, 
                delay: index * 0.1,
                ease: "easeOut"
              }}
              className="text-center"
            >
              <div className="font-navigation text-3xl lg:text-4xl font-semibold bg-gradient-to-r from-info-600 to-primary-600 bg-clip-text text-transparent mb-2">
                {stat.number}
              </div>
              <div className="font-label text-muted-foreground font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
