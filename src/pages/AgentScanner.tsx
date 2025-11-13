import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, ScanLine, User, CheckCircle2 } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  student_id: string;
  department: string;
  avatar_url?: string;
}

const AgentScanner = () => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [scannedStudent, setScannedStudent] = useState<StudentProfile | null>(null);
  const [calculatedStatus, setCalculatedStatus] = useState<"present" | "late">("present");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const currentAgentIdRef = useRef<string | null>(null);

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

  // const onScanSuccess = async (decodedText: string) => {
  //   // Empêcher les scans multiples
  //   if (isProcessing) {
  //     console.log("Scan ignoré: traitement en cours");
  //     return;
  //   }

  //   try {
  //     setIsProcessing(true);
  //     await stopScanning();
      
  //     const { data: { user } } = await supabase.auth.getUser();
  //     if (!user) {
  //       setIsProcessing(false);
  //       return;
  //     }

  //     currentAgentIdRef.current = user.id;

  //     // Récupérer les infos de l'élève d'abord
  //     const { data: studentProfile, error: profileError } = await supabase
  //       .from("profiles")
  //       .select("*")
  //       .eq("student_id", decodedText)
  //       .maybeSingle();

  //     if (profileError || !studentProfile) {
  //       toast.error("Élève introuvable");
  //       setIsProcessing(false);
  //       return;
  //     }

  //     // Vérifier si l'élève a déjà été scanné aujourd'hui
  //     const today = new Date();
  //     today.setHours(0, 0, 0, 0);
      
  //     const { data: existingRecord } = await supabase
  //       .from("attendance_records")
  //       .select("*")
  //       .eq("student_id", studentProfile.id)
  //       .gte("date", today.toISOString())
  //       .maybeSingle();

  //     if (existingRecord) {
  //       toast.error("Cet élève a déjà été scanné aujourd'hui");
  //       setIsProcessing(false);
  //       return;
  //     }

  //     // Calculer le statut automatiquement en fonction de l'heure
  //     const now = new Date();
  //     const hours = now.getHours();
  //     const minutes = now.getMinutes();
  //     const currentTime = hours * 60 + minutes;
  //     const cutoffTime = 8 * 60 + 15;

  //     const status: "present" | "late" = currentTime > cutoffTime ? "late" : "present";
      
  //     setCalculatedStatus(status);
  //     setScannedStudent(studentProfile);
  //     setShowConfirmDialog(true);
      
  //   } catch (error: any) {
  //     console.error("Error processing scan:", error);
  //     toast.error("Erreur lors du scan");
  //     setIsProcessing(false);
  //   }
  // };

  // const onScanSuccess = async (decodedText: string) => {
  //   if (isProcessing) return;
  //   setIsProcessing(true);
  //   await stopScanning();
  
  //   // Récupérer l’utilisateur connecté (l’agent)
  //   const { data: { user } } = await supabase.auth.getUser();
  //   if (!user) {
  //     setIsProcessing(false);
  //     return;
  //   }
  //   currentAgentIdRef.current = user.id;
  
  //   // Chercher le profil par UUID (decodedText)
  //   const { data: studentProfile, error: profileError } = await supabase
  //     .from("profiles")
  //     .select("*")
  //     .eq("id", decodedText) // <-- ici on compare UUID avec UUID
  //     .maybeSingle();
  
  //   if (profileError || !studentProfile) {
  //     toast.error("Élève introuvable");
  //     setIsProcessing(false);
  //     return;
  //   }
  
  //   // Vérifier si l’élève a déjà été scanné aujourd’hui
  //   const today = new Date();
  //   today.setHours(0, 0, 0, 0);
  
  //   const { data: existingRecord } = await supabase
  //     .from("attendance_records")
  //     .select("*")
  //     .eq("student_id", studentProfile.id) // UUID
  //     .gte("date", today.toISOString())
  //     .maybeSingle();
  
  //   if (existingRecord) {
  //     toast.error("Cet élève a déjà été scanné aujourd'hui");
  //     setIsProcessing(false);
  //     return;
  //   }
  
  //   // Calculer le statut automatiquement en fonction de l’heure
  //   const now = new Date();
  //   const currentTime = now.getHours() * 60 + now.getMinutes();
  //   const cutoffTime = 8 * 60 + 15;
  //   const status: "present" | "late" = currentTime > cutoffTime ? "late" : "present";
  
  //   setCalculatedStatus(status);
  //   setScannedStudent(studentProfile);
  //   setShowConfirmDialog(true);
  // };
  
  const onScanSuccess = async (decodedText: string) => {
    console.log("QR Code scanné :", decodedText);
    
    if (isProcessing) {
      console.log("Scan ignoré: traitement en cours");
      return;
    }
    setIsProcessing(true);
  
    await stopScanning();
  
    // Récupérer l’utilisateur connecté (l’agent)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error("Erreur récupération utilisateur :", userError);
      toast.error("Erreur utilisateur");
      setIsProcessing(false);
      return;
    }
    if (!user) {
      console.warn("Aucun utilisateur connecté");
      setIsProcessing(false);
      return;
    }
  
    console.log("Utilisateur connecté :", user.id);
    currentAgentIdRef.current = user.id;
  
    // Chercher le profil par UUID (decodedText)
    const { data: studentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", decodedText) // UUID
      .maybeSingle();
  
    console.log("Résultat de la requête profil :", studentProfile, profileError);
  
    if (profileError) {
      console.error("Erreur récupération profil :", profileError);
      toast.error("Erreur lors de la récupération du profil");
      setIsProcessing(false);
      return;
    }
  
    if (!studentProfile) {
      console.warn("Aucun profil trouvé pour cet UUID");
      toast.error("Élève introuvable");
      setIsProcessing(false);
      return;
    }
  
    console.log("Profil trouvé :", studentProfile);
  
    // Vérifier si l’élève a déjà été scanné aujourd’hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: existingRecord, error: recordError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("student_id", studentProfile.id)
      .gte("date", today.toISOString())
      .maybeSingle();
  
    console.log("Vérification présence existante :", existingRecord, recordError);
  
    if (recordError) {
      console.error("Erreur vérification présence :", recordError);
      setIsProcessing(false);
      return;
    }
  
    if (existingRecord) {
      toast.error("Cet élève a déjà été scanné aujourd'hui");
      setIsProcessing(false);
      return;
    }
  
    // Calcul du statut
    // const now = new Date();
    // const currentTime = now.getHours() * 60 + now.getMinutes();
    // const cutoffTime = 8 * 60 + 15;
    // const status: "present" | "late" = currentTime > cutoffTime ? "late" : "present";
  
    // console.log("Statut calculé :", status);
  
    // setCalculatedStatus(status);
    // setScannedStudent(studentProfile);
    // setShowConfirmDialog(true);

    // Calcul du statut au moment du scan
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // heure actuelle en minutes

    const cutoffPresent = 8 * 60 + 15; // 8h15
    const cutoffAbsent = 16 * 60;      // 16h00

    let status: "present" | "late" | "absent";

    if (currentTime < cutoffPresent) {
      status = "present"; // avant 8h15
    } else if (currentTime < cutoffAbsent) {
      status = "late"; // entre 8h15 et 16h00
    } else {
      status = "absent"; // après 16h
    }

    setCalculatedStatus(status);
    setScannedStudent(studentProfile);
    setShowConfirmDialog(true);

  };
  
  
  const handleConfirmAttendance = async () => {
    if (!scannedStudent || !currentAgentIdRef.current) return;

    try {
      const { error } = await supabase
        .from("attendance_records")
        .insert({
          student_id: scannedStudent.id,
          status: calculatedStatus,
          scanned_by: currentAgentIdRef.current,
        });

      if (error) throw error;

      const statusText = calculatedStatus === "present" ? "Présent" : "Retard";
      toast.success(`Présence enregistrée: ${statusText}`);
      
      setShowConfirmDialog(false);
      setScannedStudent(null);
      setIsProcessing(false);
    } catch (error: any) {
      console.error("Error recording attendance:", error);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmDialog(false);
    setScannedStudent(null);
    setIsProcessing(false);
  };

  const onScanFailure = (error: any) => {
    // Silently handle scan failures
  };

  const handleLogout = async () => {
    await stopScanning();
    await supabase.auth.signOut();
    navigate("/");
  };

  const initials = scannedStudent?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase() || "?";

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
                <Button onClick={startScanning} className="w-full" size="lg" disabled={isProcessing}>
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

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Confirmer la présence</DialogTitle>
          </DialogHeader>
          
          {scannedStudent && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Avatar className="w-24 h-24 border-4 border-primary/20">
                <AvatarImage src={scannedStudent.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold">{scannedStudent.full_name}</h3>
                <p className="text-muted-foreground">{scannedStudent.email}</p>
                {scannedStudent.student_id && (
                  <p className="text-sm font-mono text-muted-foreground">
                    #{scannedStudent.student_id}
                  </p>
                )}
                {scannedStudent.department && (
                  <p className="text-sm text-muted-foreground">
                    {scannedStudent.department}
                  </p>
                )}
              </div>

              <Badge 
                className={
                  calculatedStatus === "present" 
                    ? "bg-success text-lg py-2 px-4" 
                    : "bg-warning text-lg py-2 px-4"
                }
              >
                {calculatedStatus === "present" ? "Présent" : "Retard"}
              </Badge>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleCancelConfirmation}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmAttendance}
              className="flex-1"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentScanner;