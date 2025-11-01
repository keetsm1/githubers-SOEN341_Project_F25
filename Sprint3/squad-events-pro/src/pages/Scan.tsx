import React, { useEffect, useRef, useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { db } from '@/services/database';
import { useParams, useNavigate } from 'react-router-dom';

const Scan: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [qr, setQr] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [eventTitle, setEventTitle] = useState<string | null>(null);

  const canScan = typeof window !== 'undefined' && (window as any).BarcodeDetector;

  useEffect(() => {
    return () => {
      stopScan();
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!id || !user) return;
      try {
        const row = await (await import('@/services/database')).getEventById(id);
        const organizerId = (row as any).created_by;
        if (organizerId !== user.id && user.role !== 'admin') {
          setError('Organizer access required for this event');
        }
        setEventTitle(row.title);
      } catch (e) {
        setError('Event not found');
      }
    };
    load();
  }, [id, user]);

  if (!user) return <LoginForm />;
  if (!(user.role === 'company' || user.role === 'admin')) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">Organizer access required.</CardContent>
          </Card>
        </div>
      </div>
    );
  }
  if (!id) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">No event specified.</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const validate = async (value: string) => {
    if (!value) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await db.validateAndCheckInTicket(value, user.id, id);
      if (res.ok) setResult(res.message);
      else setError(res.message);
    } catch (e: any) {
      setError('Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const startScan = async () => {
    if (!canScan || scanning) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      const detect = async () => {
        if (!videoRef.current) return;
        try {
          const detections = await detector.detect(videoRef.current as any);
          if (detections && detections.length > 0) {
            const raw = detections[0].rawValue || detections[0].rawValue;
            stopScan();
            setQr(raw);
            validate(raw);
            return;
          }
        } catch {}
        rafRef.current = requestAnimationFrame(detect);
      };
      rafRef.current = requestAnimationFrame(detect);
    } catch (e) {
      setError('Camera access denied or not available');
    }
  };

  const stopScan = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Scan or Validate Ticket</h1>
              <p className="text-muted-foreground">Event: {eventTitle ?? id}</p>
            </div>
            <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>QR Validation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="QR code value" value={qr} onChange={(e) => setQr(e.target.value)} />
              <Button onClick={() => validate(qr)} disabled={loading || !qr}>Validate</Button>
            </div>
            {canScan && (
              <div className="space-y-3">
                {!scanning ? (
                  <Button variant="outline" onClick={startScan}>Start Camera Scan</Button>
                ) : (
                  <Button variant="destructive" onClick={stopScan}>Stop Scan</Button>
                )}
                <div className="rounded overflow-hidden bg-black/60">
                  <video ref={videoRef} className="w-full aspect-video" muted playsInline />
                </div>
              </div>
            )}
            {result && <div className="text-green-600 font-medium">{result}</div>}
            {error && <div className="text-destructive font-medium">{error}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Scan;
