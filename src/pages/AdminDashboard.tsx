import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Users, Calendar, TrendingUp, Clock } from "lucide-react";

interface DashboardStats {
  totalStudents: number;
  todayPresent: number;
  todayLate: number;
  todayAbsent: number;
  recentAttendance: any[];
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    todayPresent: 0,
    todayLate: 0,
    todayAbsent: 0,
    recentAttendance: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchStats();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth?role=admin");
    }
  };

  const fetchStats = async () => {
    try {
      const { count: studentCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const today = new Date().toISOString().split("T")[0];
      
      const { data: todayRecords } = await supabase
        .from("attendance_records")
        .select("*, profiles(full_name, student_id)")
        .gte("date", today)
        .order("date", { ascending: false })
        .limit(20);

      const todayStats = (todayRecords || []).reduce((acc, record) => {
        if (record.status === "present") acc.present++;
        else if (record.status === "late") acc.late++;
        else if (record.status === "absent") acc.absent++;
        return acc;
      }, { present: 0, late: 0, absent: 0 });

      setStats({
        totalStudents: studentCount || 0,
        todayPresent: todayStats.present,
        todayLate: todayStats.late,
        todayAbsent: todayStats.absent,
        recentAttendance: todayRecords || [],
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Erreur lors du chargement des statistiques");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
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

  const attendanceRate = stats.totalStudents > 0 
    ? Math.round((stats.todayPresent / stats.totalStudents) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-6 px-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Tableau de Bord Administrateur</h1>
          <Button variant="secondary" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Élèves</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground mt-1">Inscrits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Présents Aujourd'hui</CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{stats.todayPresent}</div>
              <p className="text-xs text-muted-foreground mt-1">{attendanceRate}% de présence</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Retards</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{stats.todayLate}</div>
              <p className="text-xs text-muted-foreground mt-1">Aujourd'hui</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Absences</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{stats.todayAbsent}</div>
              <p className="text-xs text-muted-foreground mt-1">Aujourd'hui</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Enregistrements Récents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentAttendance.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucun enregistrement aujourd'hui</p>
              ) : (
                stats.recentAttendance.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                    <div>
                      <p className="font-medium">{record.profiles?.full_name}</p>
                      <p className="text-sm text-muted-foreground">#{record.profiles?.student_id}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {new Date(record.date).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                      {getStatusBadge(record.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;