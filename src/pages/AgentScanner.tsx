import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut, ScanLine, CheckCircle } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

const AgentScanner = () => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<"present" | "late" | "absent">("present");
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    checkAuth();
    return () => {
      stopScanning();
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth?role=agent");
    }
  };

  const startScanning = async () => {
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        onScanSuccess,
        onScanFailure
      );

      setIsScanning(true);
    } catch (err) {
      console.error("Error starting scanner:", err);
      toast.error("Impossible de démarrer la caméra");
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    try {
      await stopScanning();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("attendance_records")
        .insert({
          student_id: decodedText,
          status: status,
          scanned_by: user.id,
        });

      if (error) throw error;

      toast.success("Présence enregistrée avec succès!");
    } catch (error: any) {
      console.error("Error recording attendance:", error);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const onScanFailure = (error: any) => {
    // Silently handle scan failures
  };

  const handleLogout = async () => {
    await stopScanning();
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-6 px-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Scanner de Présence</h1>
          <Button variant="secondary" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="w-5 h-5" />
              Scanner un code QR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Statut de présence</label>
              <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      Présent
                    </div>
                  </SelectItem>
                  <SelectItem value="late">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-warning" />
                      Retard
                    </div>
                  </SelectItem>
                  <SelectItem value="absent">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-destructive" />
                      Absent
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div id="qr-reader" className="w-full rounded-lg overflow-hidden bg-black"></div>
              
              {!isScanning ? (
                <Button onClick={startScanning} className="w-full" size="lg">
                  <ScanLine className="w-5 h-5 mr-2" />
                  Démarrer le scan
                </Button>
              ) : (
                <Button onClick={stopScanning} variant="destructive" className="w-full" size="lg">
                  Arrêter le scan
                </Button>
              )}
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                Placez le code QR de l'élève devant la caméra pour enregistrer sa présence
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AgentScanner;