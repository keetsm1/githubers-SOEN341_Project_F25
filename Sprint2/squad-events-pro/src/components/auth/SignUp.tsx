import React from 'react'
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import {auth} from "../../services/database"
import { useNavigate } from 'react-router-dom';

const SignUp = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);


    const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();

    if (!email.trim()) {
      toast({ title: "Error", description: "Email is required.", variant: "destructive" });
      return;
    }
    if (!confirmEmail.trim()) {
      toast({ title: "Error", description: "Please confirm your email.", variant: "destructive" });
      return;
    }
    if (email !== confirmEmail) {
      toast({ title: "Error", description: "Emails do not match.", variant: "destructive" });
      return;
    }
    if (!fullName.trim()) {
      toast({ title: "Error", description: "Full name is required.", variant: "destructive" });
      return;
    }
    if (!password) {
      toast({ title: "Error", description: "Password is required.", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }

    try {
      setIsSubmitting(true);
      const {error, session }= await auth.signUp(email, password, fullName);

      if (error){
        toast({ title: "Sign Up failed", description: error.message || "Something went wrong.", variant: "destructive" });
        return;
      }

      if (session?.user) {
        toast({ title: "Success", description: "Account created & logged in 🎉" });
      } else {
        toast({ title: "Success", description: "Account created. Please sign in." });
        navigate('/', {replace: true});
        
      }

    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
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
          <CardDescription>Sign Up to discover and manage campus events</CardDescription>
        </CardHeader>

      <CardContent>
        <form onSubmit= {handleSubmit} className= "space-y-4">
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
                <Label htmlFor="confirmEmail">Confirm Email</Label>
                <Input
                  id="confirmEmail"
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="your.email@university.edu"
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
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

            <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                />
            </div>

            <button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold py-2 px-4 rounded-lg"
                disabled= {isSubmitting}>

                {isSubmitting ? "Signing up…" : "Sign Up"}
            </button>
        </form>
      </CardContent>
      </Card>

      
    </div>
  )
}

export default SignUp