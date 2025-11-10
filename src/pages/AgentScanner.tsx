import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, ScanLine } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

const AgentScanner = () => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
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

      // Vérifier si l'élève a déjà été scanné aujourd'hui
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: existingRecord } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("student_id", decodedText)
        .gte("date", today.toISOString())
        .maybeSingle();

      if (existingRecord) {
        toast.error("Cet élève a déjà été scanné aujourd'hui");
        return;
      }

      // Calculer le statut automatiquement en fonction de l'heure
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const currentTime = hours * 60 + minutes; // Convertir en minutes
      const cutoffTime = 8 * 60 + 15; // 08h15 en minutes

      let calculatedStatus: "present" | "late" = "present";
      if (currentTime > cutoffTime) {
        calculatedStatus = "late";
      }

      const { error } = await supabase
        .from("attendance_records")
        .insert({
          student_id: decodedText,
          status: calculatedStatus,
          scanned_by: user.id,
        });

      if (error) throw error;

      const statusText = calculatedStatus === "present" ? "Présent" : "Retard";
      toast.success(`Présence enregistrée: ${statusText}`);
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
            <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
              <h3 className="font-semibold text-accent mb-2">Calcul automatique du statut</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <span className="text-success font-medium">Présent</span>: Scan entre 00h00 et 08h15</li>
                <li>• <span className="text-warning font-medium">Retard</span>: Scan après 08h15</li>
                <li>• <span className="text-destructive font-medium">Absent</span>: Non scanné de la journée</li>
              </ul>
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