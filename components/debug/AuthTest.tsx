'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function AuthTest() {
  const { data: session, status } = useSession();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchDebugInfo = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/auth');
      const data = await response.json();
      setDebugInfo(data);
    } catch (error) {
      console.error('Failed to fetch debug info:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Status:</strong> {status}
            </div>
            <div>
              <strong>Authenticated:</strong> {session ? 'Yes' : 'No'}
            </div>
            {session && (
              <>
                <div>
                  <strong>User ID:</strong> {(session.user as any)?.id || 'N/A'}
                </div>
                <div>
                  <strong>Email:</strong> {session.user?.email || 'N/A'}
                </div>
                <div>
                  <strong>Name:</strong> {session.user?.name || 'N/A'}
                </div>
                <div>
                  <strong>Role:</strong> {(session.user as any)?.role || 'N/A'}
                </div>
              </>
            )}
          </div>
          
          <div className="flex gap-4">
            <Button onClick={fetchDebugInfo} disabled={loading}>
              {loading ? 'Loading...' : 'Fetch Debug Info'}
            </Button>
            {session && (
              <Button variant="outline" onClick={() => signOut()}>
                Sign Out
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {debugInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-accent p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}