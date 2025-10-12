import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Tag, X } from 'lucide-react';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/services/database';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import LoginForm from '@/components/auth/LoginForm';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

const categories = [
    'Technology', 'Career', 'Sports', 'Arts', 'Social', 'Academic', 'Business'
];

const CreateEvent = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const qc = useQueryClient();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        location: '',
        category: '',
        maxCapacity: '',
        imageUrl: '',
        tags: [] as string[]
    });

    const [newTag, setNewTag] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingApproval, setCheckingApproval] = useState(true);
    const [approvalStatus, setApprovalStatus] = useState<'unknown' | 'approved' | 'pending' | 'rejected' | 'none'>('unknown');

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addTag = () => {
        if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, newTag.trim()]
            }));
            setNewTag('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            // Derive starts/ends; keep legacy "date" for backward compatibility
            const startsAtISO = new Date(formData.date).toISOString();
            const endsAtISO = new Date(new Date(formData.date).getTime() + 60 * 60 * 1000).toISOString(); // +1h default

            // Determine publishability
            const canPublish = user.role === 'admin' || approvalStatus === 'approved';
            const status: 'published' | 'pending' = canPublish ? 'published' : 'pending';

            // Payload supports both the legacy field names and the DB-ready names.
            const eventData: any = {
                // Canonical/DB-style
                title: formData.title,
                description: formData.description,
                starts_at: startsAtISO,
                ends_at: endsAtISO,
                location: formData.location,
                category: formData.category,
                created_by: user.id,
                organizer_id: user.id,
                org_name: (user as any).organization || user.name,
                max_cap: formData.maxCapacity ? parseInt(formData.maxCapacity, 10) : null,
                image_url: formData.imageUrl || null,
                tags: formData.tags,
                status,

                // Legacy/client-style (for current service typings/UI that expect these)
                date: startsAtISO,
                organizerId: user.id,
                organizerName: (user as any).organization || user.name,
                maxCapacity: formData.maxCapacity ? parseInt(formData.maxCapacity, 10) : undefined,
                currentAttendees: 0,
                imageUrl: formData.imageUrl || undefined,
                isApproved: canPublish,
            };

            await db.createEvent(eventData);

            // Make sure lists refresh so students see it right away
            qc.invalidateQueries({ queryKey: ['events'] });

            toast({
                title: 'Event Created!',
                description: canPublish
                    ? 'Your event has been created and is live.'
                    : 'Your event has been submitted for approval.',
            });

            // Organizer flow – go to My Events
            navigate('/my-events');
        } catch (error) {
            console.error('Create event failed', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: (error as any)?.message || 'Failed to create event. Please try again.',
            });
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return <LoginForm />;
    }

    // Fetch latest organization application status for this user (company)
    useEffect(() => {
        const run = async () => {
            if (!isSupabaseEnabled || !supabase) {
                // In mock/local mode, allow creation as published
                setApprovalStatus('approved');
                setCheckingApproval(false);
                return;
            }
            if (!user || user.role !== 'company') {
                setApprovalStatus('unknown');
                setCheckingApproval(false);
                return;
            }
            const { data, error } = await supabase
                .from('organization_applications')
                .select('status, submitted_at')
                .eq('applicant_user_id', user.id)
                .order('submitted_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error) {
                setApprovalStatus('unknown');
            } else if (!data) {
                setApprovalStatus('none');
            } else {
                const s = (data as { status: string }).status as 'approved' | 'pending' | 'rejected' | string;
                if (s === 'approved') setApprovalStatus('approved');
                else if (s === 'pending') setApprovalStatus('pending');
                else if (s === 'rejected') setApprovalStatus('rejected');
                else setApprovalStatus('unknown');
            }
            setCheckingApproval(false);
        };
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        run();
    }, [user]);

    if (checkingApproval) {
        return (
            <div className="min-h-screen bg-background">
                <Navigation />
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <Card>
                        <CardContent className="p-8 text-center">Checking organization approval…</CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // only orgs can create events.
    if (user.role !== 'company' || approvalStatus !== 'approved') {
        let message = 'Only organization (company) accounts can create events.';
        if (user.role === 'company') {
            if (approvalStatus === 'pending') message = 'Your organization application is pending approval. You can create events once approved.';
            else if (approvalStatus === 'rejected') message = 'Your organization application was rejected. Please contact an administrator for more information.';
            else if (approvalStatus === 'none') message = 'No organization application found. Please submit an application to proceed.';
            else if (approvalStatus === 'unknown') message = 'We could not verify your organization approval at this time.';
        }
        return (
            <div className="min-h-screen bg-background">
                <Navigation />
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <Card>
                        <CardContent className="p-8 text-center">
                            <h2 className="text-2xl font-bold mb-4">Access Restricted</h2>
                            <p className="text-muted-foreground">{message}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-subtle">
            <Navigation />

            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Create Event</h1>
                    <p className="text-muted-foreground">
                        Create an engaging event for the campus community
                    </p>
                </div>

                <Card className="shadow-elevated">
                    <CardHeader>
                        <CardTitle>Event Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Event Title *</Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => handleInputChange('title', e.target.value)}
                                        placeholder="Enter event title"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="category">Category *</Label>
                                    <Select onValueChange={(value) => handleInputChange('category', value)} required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(category => (
                                                <SelectItem key={category} value={category}>
                                                    {category}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description *</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    placeholder="Describe your event..."
                                    rows={4}
                                    required
                                />
                            </div>

                            {/* Date and Location */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="date" className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Date & Time *
                                    </Label>
                                    <Input
                                        id="date"
                                        type="datetime-local"
                                        value={formData.date}
                                        onChange={(e) => handleInputChange('date', e.target.value)}
                                        required
                                        min={new Date().toISOString().slice(0, 16)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="location" className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4" />
                                        Location *
                                    </Label>
                                    <Input
                                        id="location"
                                        value={formData.location}
                                        onChange={(e) => handleInputChange('location', e.target.value)}
                                        placeholder="Event location"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Capacity and Image */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="capacity" className="flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Max Capacity *
                                    </Label>
                                    <Input
                                        id="capacity"
                                        type="number"
                                        value={formData.maxCapacity}
                                        onChange={(e) => handleInputChange('maxCapacity', e.target.value)}
                                        placeholder="Maximum attendees"
                                        min="1"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="image">Event Image URL</Label>
                                    <Input
                                        id="image"
                                        type="url"
                                        value={formData.imageUrl}
                                        onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                                        placeholder="https://example.com/image.jpg"
                                    />
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Tag className="w-4 h-4" />
                                    Tags
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        placeholder="Add a tag"
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                    />
                                    <Button type="button" variant="outline" onClick={addTag}>
                                        Add
                                    </Button>
                                </div>
                                {formData.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {formData.tags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                                {tag}
                                                <X
                                                    className="w-3 h-3 cursor-pointer"
                                                    onClick={() => removeTag(tag)}
                                                />
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Submit */}
                            <div className="flex gap-4 pt-4">
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-gradient-to-r from-primary to-primary/90 flex-1"
                                >
                                    {loading ? 'Creating...' : 'Create Event'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate('/my-events')}
                                >
                                    Cancel
                                </Button>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-800">
                                    <strong>Note:</strong> Your event will be submitted for admin approval before it becomes visible to students.
                                </p>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default CreateEvent;
