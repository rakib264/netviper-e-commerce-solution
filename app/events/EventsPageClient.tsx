'use client';

import EventPreview from '@/components/events/EventPreview';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Calendar, Clock, Filter, Package, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/components/providers/LocalizationProvider';

interface Event {
  _id: string;
  title: string;
  subtitle?: string;
  bannerImage?: string;
  discountText: string;
  layoutType?: 'horizontal' | 'vertical';
  cta?: {
    label: string;
    url: string;
    openInNewTab: boolean;
  };
  showInLanding?: boolean;
  startDate: string;
  endDate: string;
  products: Array<{
    _id: string;
    name: string;
    slug: string;
    price: number;
    comparePrice?: number;
    thumbnailImage?: string;
    averageRating?: number;
    totalReviews?: number;
    quantity?: number;
  }>;
  productsCount: number;
  isActive: boolean;
  status: 'active' | 'upcoming' | 'expired' | 'inactive';
  createdAt: string;
}

export interface EventsPageClientProps {
  /** The unfiltered list, resolved on the server. */
  initialEvents?: Event[];
}

export default function EventsPageClient({
  initialEvents,
}: EventsPageClientProps = {}) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[]>(initialEvents ?? []);
  const [loading, setLoading] = useState(!initialEvents);
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming'>('all');

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('status', filter);
      }
      params.set('limit', '20');

      const response = await fetch(`/api/events?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch events');

      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  // The server resolved the unfiltered list, so the mount-time run is skipped
  // when it supplied one. Changing the filter fetches normally.
  const skipFirstFetch = useRef(Boolean(initialEvents));
  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const activeEvents = events.filter(e => e.status === 'active');
  const upcomingEvents = events.filter(e => e.status === 'upcoming');

  const getFilteredEvents = () => {
    switch (filter) {
      case 'active':
        return activeEvents;
      case 'upcoming':
        return upcomingEvents;
      default:
        return events;
    }
  };

  const filteredEvents = getFilteredEvents();

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <motion.h1
              className="text-4xl md:text-5xl font-bold text-foreground mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {t('events.specialEventsOffers')}
            </motion.h1>
            <motion.p
              className="text-xl text-muted-foreground max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              {t('events.discoverAmazingDealsAndExclusiveOffers')}
            </motion.p>
          </div>
        </div>
      </div>

      {/* Stats and Filter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Zap size={20} className="text-success-600" />
                  <span className="text-2xl font-bold text-success-600">{activeEvents.length}</span>
                </div>
                <p className="text-sm text-muted-foreground">{t('events.activeEvents')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Clock size={20} className="text-info-600" />
                  <span className="text-2xl font-bold text-info-600">{upcomingEvents.length}</span>
                </div>
                <p className="text-sm text-muted-foreground">{t('events.upcoming')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Package size={20} className="text-primary-600" />
                  <span className="text-2xl font-bold text-primary-600">
                    {events.reduce((sum, event) => sum + event.productsCount, 0)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{t('events.totalProducts')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-3">
            <Filter size={18} className="text-subtle-foreground" />
            <div className="flex space-x-2">
              {[
                { key: 'all', label: t('events.allEvents') },
                { key: 'active', label: t('events.activeNow') },
                { key: 'upcoming', label: t('events.comingSoon') }
              ].map((filterOption) => (
                <Button
                  key={filterOption.key}
                  variant={filter === filterOption.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(filterOption.key as any)}
                >
                  {filterOption.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="space-y-12">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="relative h-64 bg-border">
                  <Skeleton className="w-full h-full" />
                </div>
                <CardContent className="p-8">
                  <Skeleton className="h-8 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-1/2 mb-6" />
                  <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((j) => (
                      <Skeleton key={j} className="aspect-square" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="space-y-12">
            {filteredEvents.map((event, index) => (
              <motion.div
                key={event._id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
              >
                <EventPreview event={event} />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar size={32} className="text-subtle-foreground" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-4">
              {filter === 'active' && t('events.noActiveEvents')}
              {filter === 'upcoming' && t('events.noUpcomingEvents')}
              {filter === 'all' && t('events.noEventsAvailable')}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              {filter === 'active' && t('events.thereAreNoActiveEventsAt')}
              {filter === 'upcoming' && t('events.noUpcomingEventsScheduledStayTuned')}
              {filter === 'all' && t('events.noEventsAreCurrentlyAvailableWe')}
            </p>
            <Button
              variant="outline"
              onClick={() => setFilter('all')}
              className="inline-flex items-center space-x-2"
            >
              <Calendar size={16} />
              <span>{t('events.viewAllEvents')}</span>
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
