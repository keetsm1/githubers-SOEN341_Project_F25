import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";

const OrgSignUp: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState(""); // contact person
  const [orgName, setOrgName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // basic validations
    if (!orgName.trim()) {
      toast({ title: "Error", description: "Organization name is required.", variant: "destructive" });
      return;
    }
    if (!fullName.trim()) {
      toast({ title: "Error", description: "Contact full name is required.", variant: "destructive" });
      return;
    }
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

      // Create the auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (error) {
        toast({ title: "Sign Up failed", description: error.message, variant: "destructive" });
        return;
      }

      const user = data?.user;
      const session = data?.session;

      if (!user) {
        toast({ title: "Unexpected", description: "User was not created.", variant: "destructive" });
        return;
      }

      // Ensure e's a profile row first (FK may reference profiles.user_id)
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: user.id,
            full_name: fullName,
            role: "company",
            avatar_url: logoUrl || null,
            email,
          },
          { onConflict: "user_id" }
        );

      if (profileErr) {
        toast({ title: "Profile upsert failed", description: profileErr.message, variant: "destructive" });
        return;
      }

      // Insert organization application row
      const { error: appErr } = await supabase.from("organization_applications").insert([
        {
          applicant_user_id: user.id,
          proposed_name: orgName,
          email,
          website_url: websiteUrl || null,
          logo_url: logoUrl || null,
          status: "pending",
          submitted_at: new Date().toISOString(),
          notes: null,
        },
      ]);

      if (appErr) {
        await supabase.from("profiles").delete().eq("user_id", user.id);
        toast({ title: "Application failed", description: appErr.message, variant: "destructive" });
        return;
      }

      toast({ title: "Application submitted", description: "Your organization application is pending review.", variant: "default" });
      navigate("/", { replace: true });
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
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Organization Sign Up</CardTitle>
          <CardDescription>Create an account and submit your organization application</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Tech Club"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Your Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@organization.org"
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
                placeholder="contact@organization.org"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website (optional)</Label>
              <Input
                id="website"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://organization.org"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL (optional)</Label>
              <Input
                id="logoUrl"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://.../logo.png"
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
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting…" : "Create Account & Apply"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrgSignUp;
