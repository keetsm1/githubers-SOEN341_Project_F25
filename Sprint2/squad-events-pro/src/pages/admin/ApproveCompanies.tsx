import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Building } from 'lucide-react';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';

const ApproveCompanies = () => {
  const { user } = useAuth();

  if (!user) return <LoginForm />;
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Admin Access Required</h2>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const pendingCompanies = [
    { id: '1', name: 'Tech Innovators Club', email: 'contact@techinnovators.org', description: 'Student technology club focused on innovation' },
    { id: '2', name: 'Business Society', email: 'info@businesssociety.org', description: 'Professional business networking group' }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Approve Companies</h1>
          <p className="text-muted-foreground">Review and approve organization accounts</p>
        </div>

        <div className="space-y-6">
          {pendingCompanies.map((company) => (
            <Card key={company.id} className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    {company.name}
                  </CardTitle>
                  <Badge variant="outline">Pending</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{company.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p>{company.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button variant="destructive">
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ApproveCompanies;