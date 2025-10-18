import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Building } from 'lucide-react';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { error } from 'console';

const ApproveCompanies = () => {
  const { user } = useAuth();

  const { toast } = useToast();

  type OrgApplication = {
    application_id: string;
    applicant_user_id: string;
    proposed_name: string;
    email: string | null;
    website_url: string | null;
    logo_url: string | null;
    status: string;
    submitted_at: string | null;
    reviewed_at: string | null;
    reviewer_user_id: string | null;
    notes: string | null;
  };

  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<OrgApplication[]>([]);

  const fetchPending = async () => {
    if (!isSupabaseEnabled || !supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('organization_applications')
      .select('*')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: false });
    if (error) {
      toast({ title: 'Failed to load applications', description: error.message, variant: 'destructive' });
      setApps([]);
    } else {
      setApps(data as OrgApplication[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (app: OrgApplication, nextStatus: 'approved' | 'rejected') => {
    if (!isSupabaseEnabled || !supabase) return;
    const { error } = await supabase
      .from('organization_applications')
      .update({
        status: nextStatus,
        reviewer_user_id: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('application_id', app.application_id);
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      return;
    }

    // On approval, create an organization row based on the application
    if (nextStatus === 'approved') {
      const now = new Date().toISOString();
      const { error: orgErr } = await supabase
        .from('organizations')
        .insert({
          // org_id should default via DB (gen_random_uuid())
          owner_user_id: app.applicant_user_id,
          name: app.proposed_name,
          email: app.email,
          website_url: app.website_url,
          logo_url: app.logo_url,
          status: 'active',
          created_at: now,
          approved_at: now,
        });
      if (orgErr) {
        // Roll back the application status so we don't leave it approved without an org
        await supabase
          .from('organization_applications')
          .update({ status: 'pending', reviewed_at: null, reviewer_user_id: null })
          .eq('application_id', app.application_id);
        toast({ title: 'Organization create failed', description: orgErr.message, variant: 'destructive' });
        return;
      }
    }

    setApps((prev) => prev.filter((a) => a.application_id !== app.application_id));
    toast({ title: `Application ${nextStatus}`, description: `Marked as ${nextStatus}.` });
  };
  


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



  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Approve Companies</h1>
          <p className="text-muted-foreground">Review and approve organization accounts</p>
        </div>

        {loading ? (
          <Card className="shadow-card"><CardContent className="p-6">Loading pending applications…</CardContent></Card>
        ) : apps.length === 0 ? (
          <Card className="shadow-card"><CardContent className="p-6">No pending applications.</CardContent></Card>
        ) : (
          <div className="space-y-6">
            {apps.map((app) => (
              <Card key={app.application_id} className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Building className="w-5 h-5" />
                      {app.proposed_name}
                    </CardTitle>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{app.email || '—'}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Website</p>
                        {app.website_url ? (
                          <a className="text-primary hover:underline" href={app.website_url} target="_blank" rel="noreferrer">
                            {app.website_url}
                          </a>
                        ) : (
                          <p>—</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Applicant User ID</p>
                        <p className="font-mono text-sm break-all">{app.applicant_user_id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className="font-medium capitalize">{app.status}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Submitted At</p>
                        <p>{app.submitted_at ? new Date(app.submitted_at).toLocaleString() : '—'}</p>
                      </div>
                    </div>
                    {app.logo_url && (
                      <div className="pt-2">
                        <p className="text-sm text-muted-foreground">Logo</p>
                        <img src={app.logo_url} alt={`${app.proposed_name} logo`} className="h-12 w-12 object-contain border rounded" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p>{app.notes || '—'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button className="bg-green-600 hover:bg-green-700" onClick={() => void updateStatus(app, 'approved')}>
                        <Check className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button variant="destructive" onClick={() => void updateStatus(app, 'rejected')}>
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApproveCompanies;