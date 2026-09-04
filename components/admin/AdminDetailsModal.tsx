'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { Calendar, Clock, Mail, Shield, User, UserCheck } from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager';
  status: 'active' | 'inactive';
  lastLogin: string;
  createdAt: string;
  avatar?: string;
}

interface AdminDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: AdminUser | null;
}

export function AdminDetailsModal({ open, onOpenChange, admin }: AdminDetailsModalProps) {
  if (!admin) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: 'active' | 'inactive') => {
    return (
      <Badge 
        variant={status === 'active' ? 'default' : 'secondary'}
        className={`${
          status === 'active' 
            ? 'bg-success-100 text-success-800 hover:bg-success-100' 
            : 'bg-accent text-foreground hover:bg-accent'
        }`}
      >
        {status === 'active' ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  const getRoleBadge = (role: 'admin' | 'manager') => {
    return (
      <Badge 
        variant="outline"
        className={`${
          role === 'admin' 
            ? 'border-primary-200 text-primary-800 bg-primary-50' 
            : 'border-info-200 text-info-800 bg-info-50'
        }`}
      >
        {role === 'admin' ? 'Admin' : 'Manager'}
      </Badge>
    );
  };

  const getRoleDescription = (role: 'admin' | 'manager') => {
    return role === 'admin' 
      ? 'Full administrative access to all features and settings'
      : 'Limited access to administrative features and user management';
  };

  const getStatusDescription = (status: 'active' | 'inactive') => {
    return status === 'active'
      ? 'Account is active and can access the system'
      : 'Account is inactive and cannot access the system';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] bg-card overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Admin Details
          </DialogTitle>
          <DialogDescription>
            View detailed information about this administrator or manager.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6 bg-gradient-to-r from-primary/5 to-info-50 rounded-lg border"
          >
            <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
              <AvatarImage src={admin.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {admin.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h2 className="text-2xl font-bold text-foreground">{admin.name}</h2>
                <div className="flex gap-2">
                  {getRoleBadge(admin.role)}
                  {getStatusBadge(admin.status)}
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{admin.email}</span>
              </div>
            </div>
          </motion.div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Basic Information
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Shield className="w-5 h-5 text-subtle-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Role</p>
                    <p className="text-sm text-muted-foreground">{getRoleDescription(admin.role)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <UserCheck className="w-5 h-5 text-subtle-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Status</p>
                    <p className="text-sm text-muted-foreground">{getStatusDescription(admin.status)}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Activity Information */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Activity Information
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Clock className="w-5 h-5 text-subtle-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Last Login</p>
                    <p className="text-sm text-muted-foreground">{formatDate(admin.lastLogin)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Calendar className="w-5 h-5 text-subtle-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Account Created</p>
                    <p className="text-sm text-muted-foreground">{formatDate(admin.createdAt)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Permissions Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="space-y-4"
          >
            <Separator />
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Permissions & Access
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {admin.role === 'admin' ? (
                <>
                  <div className="flex items-center gap-3 p-3 bg-success-50 border border-success-200 rounded-lg">
                    <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                    <span className="text-sm font-medium text-success-800">Full System Access</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-success-50 border border-success-200 rounded-lg">
                    <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                    <span className="text-sm font-medium text-success-800">User Management</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-success-50 border border-success-200 rounded-lg">
                    <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                    <span className="text-sm font-medium text-success-800">System Settings</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-success-50 border border-success-200 rounded-lg">
                    <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                    <span className="text-sm font-medium text-success-800">Audit Logs</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-3 bg-info-50 border border-info-200 rounded-lg">
                    <div className="w-2 h-2 bg-info-500 rounded-full"></div>
                    <span className="text-sm font-medium text-info-800">Product Management</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-info-50 border border-info-200 rounded-lg">
                    <div className="w-2 h-2 bg-info-500 rounded-full"></div>
                    <span className="text-sm font-medium text-info-800">Order Management</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-info-50 border border-info-200 rounded-lg">
                    <div className="w-2 h-2 bg-info-500 rounded-full"></div>
                    <span className="text-sm font-medium text-info-800">Customer Support</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted border border-border rounded-lg">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                    <span className="text-sm font-medium text-muted-foreground">Limited System Access</span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
