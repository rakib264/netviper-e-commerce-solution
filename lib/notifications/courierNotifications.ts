import { toast } from '@/hooks/use-toast';

export interface CourierNotification {
  type: 'status_update' | 'created' | 'delivered' | 'error';
  title: string;
  description: string;
  orderId?: string;
  courierId?: string;
  status?: string;
}

export const showCourierNotification = (notification: CourierNotification) => {
  const { type, title, description } = notification;
  
  const getIcon = () => {
    switch (type) {
      case 'created': return '📦';
      case 'status_update': return '🚚';
      case 'delivered': return '✅';
      case 'error': return '❌';
      default: return '📋';
    }
  };

  toast({
    title: `${getIcon()} ${title}`,
    description,
    duration: type === 'error' ? 5000 : 3000,
  });
};

export const courierStatusMessages = {
  pending: {
    title: 'Courier Created',
    description: 'Courier record has been created and is pending pickup.'
  },
  picked: {
    title: 'Package Picked Up',
    description: 'Your package has been picked up by the courier.'
  },
  in_transit: {
    title: 'Package In Transit',
    description: 'Your package is on the way to its destination.'
  },
  delivered: {
    title: 'Package Delivered',
    description: 'Your package has been successfully delivered.'
  },
  returned: {
    title: 'Package Returned',
    description: 'Package has been returned to sender.'
  },
  cancelled: {
    title: 'Delivery Cancelled',
    description: 'The delivery has been cancelled.'
  }
};

export const notifyCourierStatusChange = (courierId: string, orderId: string, newStatus: string) => {
  const statusInfo = courierStatusMessages[newStatus as keyof typeof courierStatusMessages];
  
  if (statusInfo) {
    showCourierNotification({
      type: newStatus === 'delivered' ? 'delivered' : 'status_update',
      title: statusInfo.title,
      description: `${statusInfo.description} (Order: ${orderId})`,
      courierId,
      orderId,
      status: newStatus
    });
  }
};

export const notifyCourierCreated = (courierId: string, orderId: string) => {
  showCourierNotification({
    type: 'created',
    title: 'Courier Auto-Generated',
    description: `Courier ${courierId} has been automatically created for order ${orderId}`,
    courierId,
    orderId
  });
};

export const notifyCourierError = (message: string, orderId?: string) => {
  showCourierNotification({
    type: 'error',
    title: 'Courier Error',
    description: message,
    orderId
  });
};
