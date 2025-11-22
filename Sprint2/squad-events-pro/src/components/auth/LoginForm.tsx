import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await login(email, password);
    if (!success) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid email or password. Please Try Again"
      });
    } else {
      toast({
        title: "Welcome!",
        description: "Successfully logged in to Campus Events."
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">CampusEvents</CardTitle>
          <CardDescription>Sign in to discover and manage campus events</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@university.edu"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
              
            <Link to="/SignUp" className='block mt-2 text-center text-sm font-medium text-primary hover:underline'>
              <p className='text-center'>Are you a student? Create an account</p>
            </Link>

            <Link to="/OrgSignUp" className='block mt-2 text-center text-sm font-medium text-primary hover:underline'>
              <p className='text-center'>Are you an organization? Create an account</p>
            </Link>
          </form> 


          
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Demo accounts:</p>
            <div className="text-xs space-y-1">
              <div><strong>Student:</strong> alex@university.edu</div>
              <div><strong>Company:</strong> sarah@techclub.org</div>
              <div><strong>Admin:</strong> admin@university.edu</div>
              <div className="text-muted-foreground">Password: any</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;