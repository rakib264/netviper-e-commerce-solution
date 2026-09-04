'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

const categories = [
  {
    id: '1',
    name: 'Fresh Vegetables',
    description: 'Organic farm-fresh vegetables',
    image: 'https://images.pexels.com/photos/1400172/pexels-photo-1400172.jpeg?auto=compress&cs=tinysrgb&w=400',
    productCount: 85,
    color: 'from-success-500 to-success-600'
  },
  {
    id: '2',
    name: 'Fresh Fruits',
    description: 'Seasonal organic fruits',
    image: 'https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=400',
    productCount: 65,
    color: 'from-warning-500 to-destructive-500'
  },
  {
    id: '3',
    name: 'Fish & Seafood',
    description: 'Fresh fish & seafood',
    image: 'https://images.pexels.com/photos/1683545/pexels-photo-1683545.jpeg?auto=compress&cs=tinysrgb&w=400',
    productCount: 45,
    color: 'from-info-500 to-info-600'
  },
  {
    id: '4',
    name: 'Dairy & Eggs',
    description: 'Fresh dairy & free-range eggs',
    image: 'https://images.pexels.com/photos/162712/egg-white-food-protein-162712.jpeg?auto=compress&cs=tinysrgb&w=400',
    productCount: 35,
    color: 'from-warning-400 to-warning-500'
  },
  {
    id: '5',
    name: 'Grains & Pulses',
    description: 'Organic rice & lentils',
    image: 'https://images.pexels.com/photos/723198/pexels-photo-723198.jpeg?auto=compress&cs=tinysrgb&w=400',
    productCount: 55,
    color: 'from-warning-500 to-warning-600'
  },
  {
    id: '6',
    name: 'Herbs & Spices',
    description: 'Fresh herbs & authentic spices',
    image: 'https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=400',
    productCount: 40,
    color: 'from-success-600 to-success-600'
  }
];

export default function Categories() {
  return (
    <section className="py-16 lg:py-24 bg-secondary/30 font-paragraph">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-navigation text-3xl lg:text-4xl font-semibold mb-4">
            Shop by Food Category
          </h2>
          <p className="font-paragraph text-muted-foreground text-lg max-w-2xl mx-auto">
            Explore our diverse selection of organic food categories, each carefully sourced 
            to bring you the freshest and healthiest products from local farms.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="group"
            >
              <Card className="overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 h-full">
                <div className="relative">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  
                  {/* Gradient Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-60 group-hover:opacity-50 transition-opacity`} />
                  
                  {/* Content Overlay */}
                  <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                    >
                      <h3 className="font-navigation text-xl font-semibold mb-2">{category.name}</h3>
                      <p className="font-paragraph text-sm opacity-90 mb-3">{category.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-label text-sm font-medium">
                          {formatNumber(category.productCount)} fresh items
                        </span>
                        <motion.div
                          whileHover={{ x: 5 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ArrowRight size={20} />
                        </motion.div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* View All Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link href="/categories">
            <Button size="lg" className="px-8 font-button">
              View All Food Categories
              <ArrowRight className="ml-2" size={20} />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}