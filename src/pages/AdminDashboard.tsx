import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import { LogOut, Users, Calendar, TrendingUp, Clock, UserPlus, Download, Eye, Filter } from "lucide-react";

interface DashboardStats {
  totalStudents: number;
  todayPresent: number;
  todayLate: number;
  todayAbsent: number;
  recentAttendance: any[];
}

interface Student {
  id: string;
  full_name: string;
  email: string;
  student_id: string;
  department: string;
  avatar_url?: string;
  created_at: string;
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
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [chartData, setChartData] = useState<any[]>([]);
  
  // Form states
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<"student" | "agent">("student");
  const [newUserStudentId, setNewUserStudentId] = useState("");
  const [newUserDepartment, setNewUserDepartment] = useState("");

  useEffect(() => {
    checkAuth();
    fetchStats();
    fetchStudents();
    fetchChartData();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, departmentFilter]);

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

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Erreur lors du chargement des élèves");
    }
  };

  const fetchChartData = async () => {
    try {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split("T")[0];
      });

      const chartData = await Promise.all(
        last7Days.map(async (date) => {
          const { data } = await supabase
            .from("attendance_records")
            .select("status")
            .gte("date", date)
            .lt("date", new Date(new Date(date).getTime() + 86400000).toISOString());

          const stats = (data || []).reduce((acc, record) => {
            acc[record.status] = (acc[record.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          return {
            date: new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
            present: stats.present || 0,
            late: stats.late || 0,
            absent: stats.absent || 0,
          };
        })
      );

      setChartData(chartData);
    } catch (error) {
      console.error("Error fetching chart data:", error);
    }
  };

  const filterStudents = () => {
    let filtered = students;

    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (departmentFilter !== "all") {
      filtered = filtered.filter((s) => s.department === departmentFilter);
    }

    setFilteredStudents(filtered);
  };

  const handleCreateUser = async () => {
    try {
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: {
            full_name: newUserName,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!user) throw new Error("User creation failed");

      // Update profile with additional info
      if (newUserRole === "student") {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            student_id: newUserStudentId,
            department: newUserDepartment,
          })
          .eq("id", user.id);

        if (profileError) throw profileError;
      }

      // Assign role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: newUserRole,
        });

      if (roleError) throw roleError;

      toast.success(`Compte ${newUserRole === "student" ? "élève" : "agent"} créé avec succès`);
      setShowCreateDialog(false);
      resetForm();
      fetchStudents();
      fetchStats();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Erreur lors de la création du compte");
    }
  };

  const resetForm = () => {
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserName("");
    setNewUserRole("student");
    setNewUserStudentId("");
    setNewUserDepartment("");
  };

  const handleExportCSV = () => {
    const headers = ["Nom", "Email", "ID Étudiant", "Département"];
    const rows = filteredStudents.map((s) => [s.full_name, s.email, s.student_id || "", s.department || ""]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `etudiants-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Export CSV réussi");
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
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
            <TabsTrigger value="students">Élèves</TabsTrigger>
            <TabsTrigger value="create">Créer compte</TabsTrigger>
            <TabsTrigger value="statistics">Statistiques</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Liste des Élèves</CardTitle>
                  <Button onClick={handleExportCSV} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Exporter CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Rechercher par nom, email ou ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Département" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les départements</SelectItem>
                      <SelectItem value="Informatique">Informatique</SelectItem>
                      <SelectItem value="Mathématiques">Mathématiques</SelectItem>
                      <SelectItem value="Physique">Physique</SelectItem>
                      <SelectItem value="Chimie">Chimie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  {filteredStudents.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Aucun élève trouvé</p>
                  ) : (
                    filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={student.avatar_url} />
                            <AvatarFallback>
                              {student.full_name.split(" ").map(n => n[0]).join("").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{student.full_name}</p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                            <p className="text-xs text-muted-foreground">
                              ID: {student.student_id} • {student.department}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedStudent(student);
                            setShowStudentDialog(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Détails
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Créer un nouveau compte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Type de compte</Label>
                  <Select value={newUserRole} onValueChange={(v: "student" | "agent") => setNewUserRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Élève</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom complet</Label>
                    <Input
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Jean Dupont"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="jean.dupont@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mot de passe</Label>
                  <Input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                {newUserRole === "student" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ID Étudiant</Label>
                      <Input
                        value={newUserStudentId}
                        onChange={(e) => setNewUserStudentId(e.target.value)}
                        placeholder="STU2024001"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Département</Label>
                      <Select value={newUserDepartment} onValueChange={setNewUserDepartment}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Informatique">Informatique</SelectItem>
                          <SelectItem value="Mathématiques">Mathématiques</SelectItem>
                          <SelectItem value="Physique">Physique</SelectItem>
                          <SelectItem value="Chimie">Chimie</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <Button onClick={handleCreateUser} className="w-full">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Créer le compte
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Évolution sur 7 jours</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="present" stroke="hsl(var(--success))" name="Présents" />
                    <Line type="monotone" dataKey="late" stroke="hsl(var(--warning))" name="Retards" />
                    <Line type="monotone" dataKey="absent" stroke="hsl(var(--destructive))" name="Absents" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Répartition aujourd'hui</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      {
                        name: "Aujourd'hui",
                        present: stats.todayPresent,
                        late: stats.todayLate,
                        absent: stats.todayAbsent,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="present" fill="hsl(var(--success))" name="Présents" />
                    <Bar dataKey="late" fill="hsl(var(--warning))" name="Retards" />
                    <Bar dataKey="absent" fill="hsl(var(--destructive))" name="Absents" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Détails de l'élève</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={selectedStudent.avatar_url} />
                  <AvatarFallback className="text-2xl">
                    {selectedStudent.full_name.split(" ").map(n => n[0]).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">{selectedStudent.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedStudent.email}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">ID Étudiant</span>
                  <span className="font-medium">{selectedStudent.student_id || "Non renseigné"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Département</span>
                  <span className="font-medium">{selectedStudent.department || "Non renseigné"}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Date d'inscription</span>
                  <span className="font-medium">
                    {new Date(selectedStudent.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;