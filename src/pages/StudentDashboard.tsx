import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import { Mail, IdCard, LogOut, Calendar, Clock, Camera } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  student_id: string;
  department: string;
  avatar_url?: string;
}

interface AttendanceStats {
  present: number;
  late: number;
  absent: number;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<AttendanceStats>({ present: 0, late: 0, absent: 0 });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth?role=student");
    }
  };

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      const { data: attendanceData } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("student_id", user.id)
        .order("date", { ascending: false })
        .limit(10);

      if (attendanceData) {
        setRecords(attendanceData);
        
        const statsData = attendanceData.reduce((acc, record) => {
          if (record.status === "present") acc.present++;
          else if (record.status === "late") acc.late++;
          else if (record.status === "absent") acc.absent++;
          return acc;
        }, { present: 0, late: 0, absent: 0 });
        
        setStats(statsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!profile) return;
      
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) {
        throw updateError;
      }

      setProfile({ ...profile, avatar_url: publicUrl });
      
      toast.success("Photo mise à jour avec succès");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la mise à jour");
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-success">Présent</Badge>;
      case "late":
        return <Badge className="bg-warning">Retard</Badge>;
      case "absent":
        return <Badge variant="destructive">Absent</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

  const initials = profile?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-6 px-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Tableau de Bord</h1>
          <Button variant="secondary" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="relative group">
                    <Avatar className="w-20 h-20 border-4 border-primary/20">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      {uploading ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      ) : (
                        <Camera className="h-6 w-6 text-white" />
                      )}
                    </button>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-1">{profile?.full_name}</h2>
                    <p className="text-muted-foreground mb-3">{profile?.department}</p>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{profile?.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <IdCard className="w-4 h-4 text-muted-foreground" />
                        <span>#{profile?.student_id}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Présences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-success/10 rounded-lg">
                    <div className="text-3xl font-bold text-success">{stats.present}</div>
                    <div className="text-sm text-muted-foreground mt-1">Présent</div>
                  </div>
                  <div className="text-center p-4 bg-warning/10 rounded-lg">
                    <div className="text-3xl font-bold text-warning">{stats.late}</div>
                    <div className="text-sm text-muted-foreground mt-1">Retard</div>
                  </div>
                  <div className="text-center p-4 bg-destructive/10 rounded-lg">
                    <div className="text-3xl font-bold text-destructive">{stats.absent}</div>
                    <div className="text-sm text-muted-foreground mt-1">Absent</div>
                  </div>
                </div>

                <div className="relative pt-2">
                  <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-success"
                      style={{ width: `${(stats.present / (stats.present + stats.late + stats.absent) * 100) || 0}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Historique de présence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {records.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">Aucun enregistrement</p>
                  ) : (
                    records.map((record) => (
                      <div key={record.id} className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                        <span className="text-sm">
                          {new Date(record.date).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                        {getStatusBadge(record.status)}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Scanner pour la présence</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg mb-4">
                  <QRCodeSVG value={profile?.id || ""} size={200} />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Code de présence personnel
                </p>
                <p className="text-center font-mono text-lg mt-2">
                  {profile?.student_id}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;